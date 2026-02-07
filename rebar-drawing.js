import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DWGImporter } from './dwg-importer.js';

// 場景變數
let scene, camera, renderer, controls;
let rebars = [];
let selectedRebar = null;
let selectedBuildingElement = null; // 選中的建築元素
let currentRebarType = 'straight';
let gridHelper, axesHelper;
let dwgImporter; // DWG 匯入器
let buildingModel = null; // 建築模型

// 鋼筋材料密度 (kg/m)
const rebarDensity = {
    10: 0.617,
    13: 0.995,
    16: 1.578,
    19: 2.253,
    22: 3.042,
    25: 3.973,
    29: 5.059,
    32: 6.404,
    36: 7.907
};

// 專案數據
let projectData = {
    name: '未命名專案',
    rebars: [],
    settings: {
        units: 'mm',
        scale: 1
    }
};

// 初始化場景
function initScene() {
    // 創建場景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // 創建相機
    camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        10000
    );
    camera.position.set(3000, 3000, 3000);
    camera.lookAt(0, 0, 0);
    
    // 創建渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    
    // 添加控制器
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 100;
    controls.maxDistance = 10000;
    
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1000, 2000, 1000);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -2000;
    directionalLight.shadow.camera.right = 2000;
    directionalLight.shadow.camera.top = 2000;
    directionalLight.shadow.camera.bottom = -2000;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 5000;
    scene.add(directionalLight);
    
    // 添加網格
    gridHelper = new THREE.GridHelper(10000, 100, 0x888888, 0xcccccc);
    scene.add(gridHelper);
    
    // 添加座標軸
    axesHelper = new THREE.AxesHelper(1000);
    scene.add(axesHelper);
    
    // 初始化 DWG 匯入器
    dwgImporter = new DWGImporter(scene);
    
    // 添加參考平面（模擬混凝土結構）
    addReferencePlane();
    
    // 滑鼠事件
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onMouseClick);
    
    // 監聽窗口大小變化
    window.addEventListener('resize', onWindowResize);
}

// 添加參考平面
function addReferencePlane() {
    // 底板
    const slabGeometry = new THREE.BoxGeometry(3000, 200, 3000);
    const slabMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const slab = new THREE.Mesh(slabGeometry, slabMaterial);
    slab.position.y = -100;
    slab.receiveShadow = true;
    scene.add(slab);
    
    // 添加邊框
    const edges = new THREE.EdgesGeometry(slabGeometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
    line.position.copy(slab.position);
    scene.add(line);
}

// 創建直鋼筋
function createStraightRebar(params) {
    const diameter = parseInt(params.size);
    const length = parseFloat(params.length);
    const color = params.color || 0xff6b6b;
    
    const geometry = new THREE.CylinderGeometry(diameter/2, diameter/2, length, 16);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.8,
        roughness: 0.3
    });
    
    const rebar = new THREE.Mesh(geometry, material);
    rebar.castShadow = true;
    rebar.receiveShadow = true;
    
    // 旋轉使其水平
    rebar.rotation.z = Math.PI / 2;
    
    return rebar;
}

// 創建箍筋
function createStirrup(params) {
    const diameter = parseInt(params.size);
    const width = parseFloat(params.width) || 400;
    const height = parseFloat(params.height) || 600;
    const color = params.color || 0xff6b6b;
    
    const points = [];
    const hookLength = 100; // 彎鉤長度
    
    // 創建矩形箍筋路徑
    points.push(new THREE.Vector3(-width/2, -height/2, 0));
    points.push(new THREE.Vector3(width/2, -height/2, 0));
    points.push(new THREE.Vector3(width/2, height/2, 0));
    points.push(new THREE.Vector3(-width/2, height/2, 0));
    points.push(new THREE.Vector3(-width/2, -height/2, 0));
    
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 64, diameter/2, 16, false);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.8,
        roughness: 0.3
    });
    
    const stirrup = new THREE.Mesh(tubeGeometry, material);
    stirrup.castShadow = true;
    stirrup.receiveShadow = true;
    
    return stirrup;
}

// 創建彎鉤鋼筋
function createBentRebar(params) {
    const diameter = parseInt(params.size);
    const length = parseFloat(params.length);
    const bentAngle = (params.bentAngle || 90) * Math.PI / 180;
    const bentLength = parseFloat(params.bentLength) || 200;
    const color = params.color || 0xff6b6b;
    
    const points = [];
    points.push(new THREE.Vector3(0, 0, 0));
    points.push(new THREE.Vector3(length - bentLength, 0, 0));
    points.push(new THREE.Vector3(
        length - bentLength + bentLength * Math.cos(bentAngle),
        bentLength * Math.sin(bentAngle),
        0
    ));
    
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 64, diameter/2, 16, false);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.8,
        roughness: 0.3
    });
    
    const bentRebar = new THREE.Mesh(tubeGeometry, material);
    bentRebar.castShadow = true;
    bentRebar.receiveShadow = true;
    
    return bentRebar;
}

// 創建螺旋筋
function createSpiralRebar(params) {
    const diameter = parseInt(params.size);
    const spiralDiameter = parseFloat(params.spiralDiameter) || 400;
    const pitch = parseFloat(params.pitch) || 150;
    const turns = parseInt(params.turns) || 10;
    const color = params.color || 0xff6b6b;
    
    const points = [];
    const segments = turns * 32;
    
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = t * turns * Math.PI * 2;
        const y = t * pitch * turns;
        const x = spiralDiameter/2 * Math.cos(angle);
        const z = spiralDiameter/2 * Math.sin(angle);
        points.push(new THREE.Vector3(x, y, z));
    }
    
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, segments, diameter/2, 16, false);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.8,
        roughness: 0.3
    });
    
    const spiral = new THREE.Mesh(tubeGeometry, material);
    spiral.castShadow = true;
    spiral.receiveShadow = true;
    
    return spiral;
}

// 創建鋼筋網
function createRebarMesh(params) {
    const diameter = parseInt(params.size);
    const width = parseFloat(params.width) || 2000;
    const height = parseFloat(params.height) || 2000;
    const spacingX = parseFloat(params.spacingX) || 200;
    const spacingY = parseFloat(params.spacingY) || 200;
    const color = params.color || 0xff6b6b;
    
    const group = new THREE.Group();
    
    // 橫向鋼筋
    const countX = Math.floor(height / spacingX) + 1;
    for (let i = 0; i < countX; i++) {
        const geometry = new THREE.CylinderGeometry(diameter/2, diameter/2, width, 16);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.8,
            roughness: 0.3
        });
        const rebar = new THREE.Mesh(geometry, material);
        rebar.rotation.z = Math.PI / 2;
        rebar.position.y = i * spacingX - height/2;
        rebar.castShadow = true;
        group.add(rebar);
    }
    
    // 縱向鋼筋
    const countY = Math.floor(width / spacingY) + 1;
    for (let i = 0; i < countY; i++) {
        const geometry = new THREE.CylinderGeometry(diameter/2, diameter/2, height, 16);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.8,
            roughness: 0.3
        });
        const rebar = new THREE.Mesh(geometry, material);
        rebar.position.x = i * spacingY - width/2;
        rebar.castShadow = true;
        group.add(rebar);
    }
    
    return group;
}

// 添加鋼筋到場景
function addRebar() {
    const type = currentRebarType;
    const size = document.getElementById('rebarSize').value;
    const length = document.getElementById('rebarLength').value;
    const spacing = document.getElementById('rebarSpacing').value;
    const count = parseInt(document.getElementById('rebarCount').value);
    const color = document.getElementById('rebarColor').value;
    const colorHex = parseInt(color.replace('#', '0x'));
    
    const params = {
        size: size,
        length: length,
        spacing: spacing,
        color: colorHex,
        width: 400,
        height: 600,
        bentAngle: 90,
        bentLength: 200,
        spiralDiameter: 400,
        pitch: 150,
        turns: 10,
        spacingX: spacing,
        spacingY: spacing
    };
    
    let rebarGroup = new THREE.Group();
    
    for (let i = 0; i < count; i++) {
        let rebar;
        
        switch(type) {
            case 'straight':
                rebar = createStraightRebar(params);
                rebar.position.y = i * parseFloat(spacing);
                break;
            case 'stirrup':
                rebar = createStirrup(params);
                rebar.position.x = i * parseFloat(spacing);
                break;
            case 'bent':
                rebar = createBentRebar(params);
                rebar.position.y = i * parseFloat(spacing);
                break;
            case 'spiral':
                rebar = createSpiralRebar(params);
                rebar.position.x = i * parseFloat(spacing) * 2;
                break;
            case 'mesh':
                rebar = createRebarMesh(params);
                break;
        }
        
        if (rebar) {
            rebarGroup.add(rebar);
        }
        
        if (type === 'mesh') break; // 鋼筋網只創建一次
    }
    
    scene.add(rebarGroup);
    
    // 添加到鋼筋列表
    const rebarData = {
        id: Date.now(),
        type: type,
        params: params,
        count: count,
        mesh: rebarGroup
    };
    
    rebars.push(rebarData);
    updateRebarList();
    updateStatistics();
    
    document.getElementById('saveStatus').textContent = '未儲存';
}

// 更新鋼筋列表
function updateRebarList() {
    const listContainer = document.getElementById('rebarList');
    listContainer.innerHTML = '';
    
    rebars.forEach((rebar, index) => {
        const item = document.createElement('div');
        item.className = 'rebar-item';
        item.dataset.id = rebar.id;
        
        const typeNames = {
            'straight': '直鋼筋',
            'stirrup': '箍筋',
            'bent': '彎鉤鋼筋',
            'spiral': '螺旋筋',
            'mesh': '鋼筋網'
        };
        
        item.innerHTML = `
            <div class="rebar-item-title">${typeNames[rebar.type]} #${index + 1}</div>
            <div class="rebar-item-info">
                規格: D${rebar.params.size} | 
                數量: ${rebar.count} 支 | 
                長度: ${rebar.params.length}mm
            </div>
        `;
        
        item.addEventListener('click', () => selectRebar(rebar));
        listContainer.appendChild(item);
    });
}

// 選擇鋼筋
function selectRebar(rebar) {
    // 取消之前的選擇
    if (selectedRebar) {
        selectedRebar.mesh.traverse((child) => {
            if (child.isMesh && child.material.emissive) {
                child.material.emissive.setHex(0x000000);
            }
        });
    }
    
    selectedRebar = rebar;
    
    // 高亮選中的鋼筋
    rebar.mesh.traverse((child) => {
        if (child.isMesh && child.material.emissive) {
            child.material.emissive.setHex(0x4444ff);
        }
    });
    
    // 更新列表選中狀態
    document.querySelectorAll('.rebar-item').forEach(item => {
        item.classList.remove('selected');
        if (parseInt(item.dataset.id) === rebar.id) {
            item.classList.add('selected');
        }
    });
}

// 刪除選中的鋼筋
function deleteSelectedRebar() {
    if (selectedRebar) {
        scene.remove(selectedRebar.mesh);
        rebars = rebars.filter(r => r.id !== selectedRebar.id);
        selectedRebar = null;
        updateRebarList();
        updateStatistics();
        document.getElementById('saveStatus').textContent = '未儲存';
    }
}

// 更新統計資訊
function updateStatistics() {
    let totalCount = 0;
    let totalLength = 0;
    let totalWeight = 0;
    
    rebars.forEach(rebar => {
        const size = parseInt(rebar.params.size);
        const length = parseFloat(rebar.params.length) / 1000; // 轉換為米
        const count = rebar.count;
        
        if (rebar.type === 'mesh') {
            const width = rebar.params.width / 1000;
            const height = rebar.params.height / 1000;
            const spacingX = rebar.params.spacingX / 1000;
            const spacingY = rebar.params.spacingY / 1000;
            
            const countX = Math.floor(height * 1000 / rebar.params.spacingX) + 1;
            const countY = Math.floor(width * 1000 / rebar.params.spacingY) + 1;
            
            totalCount += countX + countY;
            totalLength += (countX * width) + (countY * height);
        } else {
            totalCount += count;
            totalLength += length * count;
        }
    });
    
    // 計算重量（使用平均直徑）
    const avgDensity = 2.0; // kg/m 近似值
    totalWeight = totalLength * avgDensity;
    
    document.getElementById('totalCount').textContent = totalCount;
    document.getElementById('totalLength').textContent = totalLength.toFixed(2);
    document.getElementById('totalWeight').textContent = totalWeight.toFixed(2);
    document.getElementById('concreteVolume').textContent = '3.6'; // 示例值
}

// 滑鼠移動事件
function onMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 更新滑鼠座標顯示（簡化版）
    document.getElementById('mouseX').textContent = Math.round(x);
    document.getElementById('mouseY').textContent = Math.round(y);
}

// 滑鼠點擊事件
function onMouseClick(event) {
    // 射線檢測選擇鋼筋或建築元素
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // 檢測建築元素
    if (buildingModel && dwgImporter.builder.buildingElements.length > 0) {
        const intersects = raycaster.intersectObjects(dwgImporter.builder.buildingElements);
        if (intersects.length > 0) {
            selectBuildingElement(intersects[0].object);
            return;
        }
    }
    
    // 檢測鋼筋
    const allMeshes = [];
    rebars.forEach(rebar => {
        rebar.mesh.traverse(child => {
            if (child.isMesh) allMeshes.push(child);
        });
    });
    
    const intersects = raycaster.intersectObjects(allMeshes);
    
    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const clickedRebar = rebars.find(r => r.mesh === clickedMesh.parent || r.mesh === clickedMesh.parent.parent);
        if (clickedRebar) {
            selectRebar(clickedRebar);
        }
    } else {
        // 取消選擇
        deselectBuildingElement();
    }
}

// 選擇建築元素
function selectBuildingElement(element) {
    // 取消之前的選擇
    deselectBuildingElement();
    
    selectedBuildingElement = element;
    
    // 高亮顯示
    if (element.material) {
        element.material.emissive = new THREE.Color(0x4444ff);
        element.material.emissiveIntensity = 0.3;
    }
    
    // 更新 UI
    const height = element.userData.height || 0;
    document.getElementById('elementHeight').disabled = false;
    document.getElementById('elementHeight').value = height;
    document.getElementById('elementHeightValue').textContent = height;
    
    console.log(`選中建築元素: ${element.userData.type} (${element.userData.id}), 高度: ${height}mm`);
}

// 取消選擇建築元素
function deselectBuildingElement() {
    if (selectedBuildingElement && selectedBuildingElement.material) {
        selectedBuildingElement.material.emissive = new THREE.Color(0x000000);
        selectedBuildingElement.material.emissiveIntensity = 0;
    }
    selectedBuildingElement = null;
    
    document.getElementById('elementHeight').disabled = true;
    document.getElementById('elementHeightValue').textContent = '-';
}

// 視圖切換
function setView(viewType) {
    switch(viewType) {
        case 'top':
            camera.position.set(0, 5000, 0);
            camera.lookAt(0, 0, 0);
            document.getElementById('currentView').textContent = '俯視圖';
            break;
        case 'front':
            camera.position.set(0, 0, 5000);
            camera.lookAt(0, 0, 0);
            document.getElementById('currentView').textContent = '正視圖';
            break;
        case '3d':
            camera.position.set(3000, 3000, 3000);
            camera.lookAt(0, 0, 0);
            document.getElementById('currentView').textContent = '3D視圖';
            break;
    }
    controls.update();
}

// 匯出圖片
function exportImage() {
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${projectData.name}_${Date.now()}.png`;
    link.href = dataURL;
    link.click();
}

// 匯入 DXF 檔案
async function importDXFFile(file, options) {
    try {
        // 顯示載入中
        document.getElementById('buildingInfo').textContent = '載入中...';
        
        const result = await dwgImporter.importDXF(file);
        
        if (result.success) {
            buildingModel = result.building;
            
            // 更新狀態列
            const info = dwgImporter.getBuildingInfo();
            document.getElementById('buildingInfo').textContent = 
                `牆: ${info.wallCount} | 柱: ${info.columnCount} | 層高: ${info.floorHeight}mm`;
            
            // 調整相機位置以適應建築
            fitCameraToBuilding();
            
            alert(`成功匯入！\n實體數量: ${result.entityCount}\n牆體: ${info.wallCount}\n柱子: ${info.columnCount}`);
        } else {
            alert('匯入失敗：' + (result.message || '未知錯誤'));
            document.getElementById('buildingInfo').textContent = '匯入失敗';
        }
    } catch (error) {
        console.error('匯入錯誤:', error);
        alert('檔案解析錯誤：' + error.message);
        document.getElementById('buildingInfo').textContent = '匯入失敗';
    }
}

// 匯入 DWG 檔案
async function importDWGFile(file, options) {
    const result = await dwgImporter.importDWG(file);
    if (!result.success) {
        // 提示用戶轉換
        if (confirm('DWG 檔案需要先轉換為 DXF 格式。\n\n建議步驟：\n1. 使用 AutoCAD 開啟 DWG\n2. 另存為 DXF 格式\n3. 重新匯入 DXF 檔案\n\n是否要開啟線上轉換工具？')) {
            window.open('https://www.zamzar.com/convert/dwg-to-dxf/', '_blank');
        }
    }
}

// 調整相機以適應建築
function fitCameraToBuilding() {
    if (!buildingModel) return;
    
    const box = new THREE.Box3().setFromObject(buildingModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    
    cameraZ *= 1.5; // 增加一些距離
    
    camera.position.set(center.x + cameraZ, cameraZ, center.z + cameraZ);
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();
}

// 清除建築模型
function clearBuilding() {
    if (buildingModel) {
        scene.remove(buildingModel);
        buildingModel = null;
        document.getElementById('buildingInfo').textContent = '未匯入';
    }
}

// 儲存專案
function saveProject() {
    projectData.rebars = rebars.map(r => ({
        type: r.type,
        params: r.params,
        count: r.count,
        position: r.mesh.position.toArray(),
        rotation: r.mesh.rotation.toArray()
    }));
    
    const json = JSON.stringify(projectData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${projectData.name}.json`;
    link.href = url;
    link.click();
    
    document.getElementById('saveStatus').textContent = '已儲存';
}

// 窗口大小調整
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 動畫循環
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// 初始化並啟動
initScene();
animate();

// 事件監聽（必須在 initScene() 之後）
document.querySelectorAll('.rebar-type-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.rebar-type-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentRebarType = e.target.dataset.type;
    });
});

document.getElementById('newProject').addEventListener('click', () => {
    if (confirm('確定要新建專案？未儲存的變更將會遺失。')) {
        rebars.forEach(r => scene.remove(r.mesh));
        rebars = [];
        selectedRebar = null;
        clearBuilding();
        updateRebarList();
        updateStatistics();
        projectData.name = '未命名專案';
        document.getElementById('projectName').textContent = projectData.name;
    }
});

// 匯入 DXF 按鈕
document.getElementById('importDXF').addEventListener('click', () => {
    document.getElementById('importModal').classList.add('show');
    document.getElementById('fileInput').value = '';
});

// 匯入 DWG 按鈕
document.getElementById('importDWG').addEventListener('click', () => {
    document.getElementById('importModal').classList.add('show');
    document.getElementById('fileInput').value = '';
});

// 取消匯入
document.getElementById('cancelImport').addEventListener('click', () => {
    document.getElementById('importModal').classList.remove('show');
});

// 確認匯入
document.getElementById('confirmImport').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('請選擇檔案');
        return;
    }
    
    const options = {
        floorHeight: parseInt(document.getElementById('importFloorHeight').value),
        wallThickness: parseInt(document.getElementById('importWallThickness').value),
        slabThickness: parseInt(document.getElementById('importSlabThickness').value)
    };
    
    // 關閉對話框
    document.getElementById('importModal').classList.remove('show');
    
    // 清除現有建築
    clearBuilding();
    
    // 根據檔案類型匯入
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.dxf')) {
        await importDXFFile(file, options);
    } else if (fileName.endsWith('.dwg')) {
        await importDWGFile(file, options);
    } else {
        alert('不支援的檔案格式。請選擇 .dxf 或 .dwg 檔案。');
    }
});

document.getElementById('saveProject').addEventListener('click', saveProject);

document.getElementById('exportImage').addEventListener('click', exportImage);

document.getElementById('deleteBtn').addEventListener('click', deleteSelectedRebar);

document.getElementById('viewTop').addEventListener('click', () => setView('top'));
document.getElementById('viewFront').addEventListener('click', () => setView('front'));
document.getElementById('view3D').addEventListener('click', () => setView('3d'));

document.getElementById('showGrid').addEventListener('change', (e) => {
    gridHelper.visible = e.target.checked;
});

// 建築高度調整
document.getElementById('buildingHeight').addEventListener('input', (e) => {
    const height = parseInt(e.target.value);
    document.getElementById('buildingHeightValue').textContent = height;
});

document.getElementById('elementHeight').addEventListener('input', (e) => {
    const height = parseInt(e.target.value);
    document.getElementById('elementHeightValue').textContent = height;
    
    if (selectedBuildingElement && dwgImporter && dwgImporter.builder) {
        dwgImporter.builder.setElementHeight(selectedBuildingElement, height);
    }
});

document.getElementById('applyHeightToAll').addEventListener('click', () => {
    const height = parseInt(document.getElementById('buildingHeight').value);
    if (dwgImporter && dwgImporter.builder) {
        dwgImporter.builder.setAllElementsHeight(height);
        alert(`已將所有建築元素高度設定為 ${height}mm`);
    }
});

document.getElementById('show2DPlan').addEventListener('change', (e) => {
    if (dwgImporter && dwgImporter.builder) {
        dwgImporter.builder.toggle2DPlan(e.target.checked);
    }
});

// 添加鋼筋按鈕（通過雙擊空白處）
renderer.domElement.addEventListener('dblclick', (e) => {
    if (e.target === renderer.domElement) {
        addRebar();
    }
});

// 鍵盤快捷鍵
document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' && selectedRebar) {
        deleteSelectedRebar();
    }
    if (e.key === 'a' || e.key === 'A') {
        addRebar();
    }
});

// 添加一些示例鋼筋
setTimeout(() => {
    addRebar();
}, 500);

console.log('鋼筋配筋繪製系統已啟動');
console.log('操作提示：');
console.log('- 雙擊空白處或按 A 鍵添加鋼筋');
console.log('- 點擊鋼筋或右側列表選擇');
console.log('- 按 Delete 鍵刪除選中的鋼筋');
console.log('- 拖曳滑鼠旋轉視角，滾輪縮放');
