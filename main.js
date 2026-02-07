import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 場景設置
let scene, camera, renderer, controls;
let agents = [];
let obstacles = [];
let target;
let isTraining = false;
let isPaused = false;
let stats = {
    episode: 0,
    steps: 0,
    totalReward: 0,
    successCount: 0
};

// RL 參數
let learningRate = 0.1;
let epsilon = 0.3;
let gamma = 0.95;
let animationSpeed = 1;

// 初始化場景
function initScene() {
    // 創建場景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);
    
    // 創建相機
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 15, 15);
    camera.lookAt(0, 0, 0);
    
    // 創建渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    
    // 添加控制器
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);
    
    // 創建地面
    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x16213e,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // 添加網格線
    const gridHelper = new THREE.GridHelper(30, 30, 0x4ade80, 0x2d3748);
    scene.add(gridHelper);
    
    // 創建目標
    createTarget();
    
    // 創建障礙物
    createObstacles();
    
    // 創建初始智能體
    createAgent();
    
    // 監聽窗口大小變化
    window.addEventListener('resize', onWindowResize);
}

// 創建目標
function createTarget() {
    const geometry = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0x4ade80,
        emissive: 0x4ade80,
        emissiveIntensity: 0.5,
        metalness: 0.5,
        roughness: 0.3
    });
    target = new THREE.Mesh(geometry, material);
    target.position.set(8, 0.15, 8);
    target.castShadow = true;
    scene.add(target);
    
    // 添加發光效果
    const glowGeometry = new THREE.RingGeometry(0.8, 1.5, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x4ade80,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.01;
    target.add(glow);
}

// 創建障礙物
function createObstacles() {
    const obstaclePositions = [
        { x: 0, z: 4 },
        { x: 4, z: 0 },
        { x: -4, z: 4 },
        { x: 4, z: -4 },
        { x: -6, z: -6 }
    ];
    
    obstaclePositions.forEach(pos => {
        const geometry = new THREE.BoxGeometry(1.5, 2, 1.5);
        const material = new THREE.MeshStandardMaterial({
            color: 0xe74c3c,
            roughness: 0.7,
            metalness: 0.3
        });
        const obstacle = new THREE.Mesh(geometry, material);
        obstacle.position.set(pos.x, 1, pos.z);
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;
        scene.add(obstacle);
        obstacles.push(obstacle);
    });
}

// 創建智能體
function createAgent() {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0x667eea,
        emissive: 0x667eea,
        emissiveIntensity: 0.3,
        metalness: 0.6,
        roughness: 0.4
    });
    const agent = new THREE.Mesh(geometry, material);
    agent.position.set(-8, 0.5, -8);
    agent.castShadow = true;
    scene.add(agent);
    
    // 添加路徑追蹤
    const pathMaterial = new THREE.LineBasicMaterial({
        color: 0x667eea,
        transparent: true,
        opacity: 0.6
    });
    const pathGeometry = new THREE.BufferGeometry();
    const pathLine = new THREE.Line(pathGeometry, pathMaterial);
    scene.add(pathLine);
    
    // 智能體數據
    const agentData = {
        mesh: agent,
        path: pathLine,
        pathPoints: [],
        velocity: new THREE.Vector3(),
        qTable: {},
        currentState: null,
        episodeReward: 0,
        stepCount: 0
    };
    
    agents.push(agentData);
    updateAgentCount();
}

// 獲取狀態（離散化位置）
function getState(position) {
    const gridSize = 2;
    const x = Math.floor(position.x / gridSize);
    const z = Math.floor(position.z / gridSize);
    return `${x},${z}`;
}

// 獲取 Q 值
function getQValue(agent, state, action) {
    const key = `${state}-${action}`;
    return agent.qTable[key] || 0;
}

// 設置 Q 值
function setQValue(agent, state, action, value) {
    const key = `${state}-${action}`;
    agent.qTable[key] = value;
}

// 選擇動作（ε-greedy）
function selectAction(agent, state) {
    if (Math.random() < epsilon) {
        // 探索：隨機動作
        return Math.floor(Math.random() * 4);
    } else {
        // 利用：選擇最佳動作
        let bestAction = 0;
        let bestValue = getQValue(agent, state, 0);
        
        for (let action = 1; action < 4; action++) {
            const value = getQValue(agent, state, action);
            if (value > bestValue) {
                bestValue = value;
                bestAction = action;
            }
        }
        
        return bestAction;
    }
}

// 執行動作
function executeAction(agent, action) {
    const moveSpeed = 0.15 * animationSpeed;
    
    switch(action) {
        case 0: // 向前
            agent.velocity.z = moveSpeed;
            agent.velocity.x = 0;
            break;
        case 1: // 向後
            agent.velocity.z = -moveSpeed;
            agent.velocity.x = 0;
            break;
        case 2: // 向左
            agent.velocity.x = -moveSpeed;
            agent.velocity.z = 0;
            break;
        case 3: // 向右
            agent.velocity.x = moveSpeed;
            agent.velocity.z = 0;
            break;
    }
}

// 檢查碰撞
function checkCollision(position) {
    for (let obstacle of obstacles) {
        const distance = position.distanceTo(obstacle.position);
        if (distance < 1.5) {
            return true;
        }
    }
    return false;
}

// 計算獎勵
function calculateReward(agent, newPosition) {
    const distanceToTarget = newPosition.distanceTo(target.position);
    
    // 到達目標
    if (distanceToTarget < 1.5) {
        return 100;
    }
    
    // 碰撞障礙物
    if (checkCollision(newPosition)) {
        return -50;
    }
    
    // 距離獎勵
    const oldDistance = agent.mesh.position.distanceTo(target.position);
    const reward = (oldDistance - distanceToTarget) * 10;
    
    return reward - 0.1; // 時間懲罰
}

// 更新智能體
function updateAgent(agent) {
    if (!isTraining || isPaused) return;
    
    const currentState = getState(agent.mesh.position);
    const action = selectAction(agent, currentState);
    executeAction(agent, action);
    
    // 更新位置
    const newPosition = agent.mesh.position.clone().add(agent.velocity);
    
    // 邊界檢查
    newPosition.x = Math.max(-14, Math.min(14, newPosition.x));
    newPosition.z = Math.max(-14, Math.min(14, newPosition.z));
    
    // 計算獎勵
    const reward = calculateReward(agent, newPosition);
    agent.episodeReward += reward;
    
    // 更新 Q 表
    const newState = getState(newPosition);
    const oldQValue = getQValue(agent, currentState, action);
    
    let maxNextQ = getQValue(agent, newState, 0);
    for (let a = 1; a < 4; a++) {
        const q = getQValue(agent, newState, a);
        if (q > maxNextQ) maxNextQ = q;
    }
    
    const newQValue = oldQValue + learningRate * (reward + gamma * maxNextQ - oldQValue);
    setQValue(agent, currentState, action, newQValue);
    
    // 更新位置
    agent.mesh.position.copy(newPosition);
    
    // 更新路徑
    agent.pathPoints.push(newPosition.clone());
    if (agent.pathPoints.length > 100) {
        agent.pathPoints.shift();
    }
    
    const positions = new Float32Array(agent.pathPoints.length * 3);
    agent.pathPoints.forEach((p, i) => {
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
    });
    agent.path.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // 更新統計
    agent.stepCount++;
    stats.steps++;
    stats.totalReward += reward;
    
    // 檢查回合結束條件
    const distanceToTarget = agent.mesh.position.distanceTo(target.position);
    if (distanceToTarget < 1.5) {
        stats.successCount++;
        resetAgent(agent);
    } else if (checkCollision(agent.mesh.position) || agent.stepCount > 200) {
        resetAgent(agent);
    }
    
    updateStats();
}

// 重置智能體
function resetAgent(agent) {
    agent.mesh.position.set(-8 + Math.random() * 2, 0.5, -8 + Math.random() * 2);
    agent.velocity.set(0, 0, 0);
    agent.episodeReward = 0;
    agent.stepCount = 0;
    stats.episode++;
}

// 更新統計資訊
function updateStats() {
    document.getElementById('episode').textContent = stats.episode;
    document.getElementById('steps').textContent = stats.steps;
    document.getElementById('reward').textContent = stats.totalReward.toFixed(2);
    const successRate = stats.episode > 0 ? (stats.successCount / stats.episode * 100).toFixed(1) : 0;
    document.getElementById('successRate').textContent = successRate + '%';
}

// 更新智能體數量
function updateAgentCount() {
    document.getElementById('agentCount').textContent = agents.length;
}

// 動畫循環
function animate() {
    requestAnimationFrame(animate);
    
    // 更新所有智能體
    agents.forEach(agent => updateAgent(agent));
    
    // 目標發光動畫
    if (target) {
        target.rotation.y += 0.01;
        const pulseScale = 1 + Math.sin(Date.now() * 0.003) * 0.1;
        target.children[0].scale.set(pulseScale, pulseScale, 1);
    }
    
    controls.update();
    renderer.render(scene, camera);
}

// 窗口大小調整
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 控制按鈕事件
document.getElementById('startBtn').addEventListener('click', () => {
    isTraining = true;
    isPaused = false;
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    isPaused = !isPaused;
});

document.getElementById('resetBtn').addEventListener('click', () => {
    agents.forEach(agent => {
        agent.qTable = {};
        resetAgent(agent);
        agent.pathPoints = [];
    });
    stats = { episode: 0, steps: 0, totalReward: 0, successCount: 0 };
    updateStats();
});

document.getElementById('addAgentBtn').addEventListener('click', () => {
    if (agents.length < 10) {
        createAgent();
    }
});

document.getElementById('clearPathBtn').addEventListener('click', () => {
    agents.forEach(agent => {
        agent.pathPoints = [];
        agent.path.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    });
});

// 滑桿事件
document.getElementById('learningRate').addEventListener('input', (e) => {
    learningRate = parseFloat(e.target.value);
    document.getElementById('learningRateValue').textContent = learningRate.toFixed(2);
});

document.getElementById('epsilon').addEventListener('input', (e) => {
    epsilon = parseFloat(e.target.value);
    document.getElementById('epsilonValue').textContent = epsilon.toFixed(2);
});

document.getElementById('speed').addEventListener('input', (e) => {
    animationSpeed = parseFloat(e.target.value);
    document.getElementById('speedValue').textContent = animationSpeed.toFixed(1) + 'x';
});

// 初始化並啟動
initScene();
animate();
