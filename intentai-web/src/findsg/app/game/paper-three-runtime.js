/** Optional real Three.js path. Canvas interaction is already available while
 * this import resolves; the caller owns timeout, cancellation and fallback. */
export async function createPaperThreeRenderer(host, options) {
  const THREE = await import('three');
  if (options.isCancelled?.()) return null;
  let renderer, geometry, frontMaterial, backMaterial, frontTexture, backTexture, scene, floorGeometry, floorMaterial, light;
  const canvas = host.ownerDocument.createElement('canvas'); canvas.className = 'paper-crumple-canvas paper-crumple-canvas--three';
  try {
    renderer = new THREE.WebGLRenderer({canvas, alpha: true, antialias: true, powerPreference: 'low-power'});
    renderer.setClearColor(0, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = options.shadow !== false; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const mesh = options.mesh; geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(mesh.renderPositions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('normal', new THREE.BufferAttribute(mesh.renderNormals, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('uv', new THREE.BufferAttribute(mesh.expandedUvs, 2));
    const material = {roughness: Math.max(0, Math.min(1, options.roughness ?? .92)), metalness: 0, color: 0xffffff};
    frontMaterial = new THREE.MeshStandardMaterial({...material, side: THREE.FrontSide}); backMaterial = new THREE.MeshStandardMaterial({...material, side: THREE.BackSide});
    const sheet = new THREE.Group(), front = new THREE.Mesh(geometry, frontMaterial), back = new THREE.Mesh(geometry, backMaterial); front.castShadow = back.castShadow = options.shadow !== false; front.receiveShadow = back.receiveShadow = true; sheet.add(front, back);
    scene = new THREE.Scene(); scene.add(sheet); scene.add(new THREE.HemisphereLight(0xfff8e7, 0x778170, 1.5));
    light = new THREE.DirectionalLight(0xfff1d5, options.lightIntensity ?? 1.8); light.castShadow = options.shadow !== false; light.shadow.mapSize.set(1024, 1024); light.shadow.bias = -.0001; light.shadow.normalBias = .15; light.shadow.radius = 4; scene.add(light, light.target);
    floorGeometry = new THREE.PlaneGeometry(1, 1); floorMaterial = new THREE.ShadowMaterial({opacity: options.shadowOpacity ?? .11, depthWrite: false}); const floor = new THREE.Mesh(floorGeometry, floorMaterial); floor.receiveShadow = true; floor.visible = options.shadow !== false; scene.add(floor);
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 10000);
    const lost = event => {event.preventDefault(); options.onContextLost?.();}; canvas.addEventListener('webglcontextlost', lost);
    let disposed = false;
    function setTextures(textures) {
      frontTexture?.dispose(); backTexture?.dispose(); frontTexture = new THREE.CanvasTexture(textures.front); backTexture = new THREE.CanvasTexture(textures.back);
      for (const texture of [frontTexture, backTexture]) {texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());}
      backTexture.repeat.x = -1; backTexture.offset.x = 1;
      frontMaterial.map = frontTexture; backMaterial.map = backTexture; frontMaterial.needsUpdate = backMaterial.needsUpdate = true;
    }
    setTextures(options.textures); host.append(canvas);
    return {
      engine: 'three-webgl', canvas, setTextures,
      resize(width, height) {if (disposed) return; renderer.setPixelRatio(Math.min(host.ownerDocument.defaultView.devicePixelRatio || 1, 1.6)); renderer.setSize(width, height, false); camera.aspect = width / height; camera.position.z = height / (2 * Math.tan(35 * Math.PI / 360)); camera.updateProjectionMatrix(); const reach = Math.max(width, height), angle = (options.lightAngle ?? -35) * Math.PI / 180; light.position.set(Math.sin(angle) * reach, Math.cos(angle) * reach, reach * 3); light.shadow.camera.left = light.shadow.camera.bottom = -reach; light.shadow.camera.right = light.shadow.camera.top = reach; light.shadow.camera.near = 1; light.shadow.camera.far = reach * 5; light.shadow.camera.updateProjectionMatrix(); floor.scale.set(width * 3, height * 3, 1);},
      draw(mesh, pose, viewport) {if (disposed) return; geometry.attributes.position.needsUpdate = true; geometry.attributes.normal.needsUpdate = true; geometry.computeBoundingSphere(); sheet.scale.setScalar(viewport.scale); sheet.position.set(pose.x || 0, pose.y || 0, 0); sheet.rotation.set(pose.rx || 0, pose.ry || 0, pose.rz || 0, 'ZYX'); let low = 0; for (let i = 2; i < mesh.positions.length; i += 3) low = Math.min(low, mesh.positions[i]); floor.position.z = low * viewport.scale - viewport.scale * .12; renderer.render(scene, camera);},
      dispose() {if (disposed) return; disposed = true; canvas.removeEventListener('webglcontextlost', lost); geometry.dispose(); frontMaterial.dispose(); backMaterial.dispose(); frontTexture?.dispose(); backTexture?.dispose(); floorGeometry.dispose(); floorMaterial.dispose(); light.shadow.dispose(); renderer.dispose(); canvas.remove();},
    };
  } catch (error) {
    geometry?.dispose(); frontMaterial?.dispose(); backMaterial?.dispose(); frontTexture?.dispose(); backTexture?.dispose(); floorGeometry?.dispose(); floorMaterial?.dispose(); renderer?.dispose(); canvas.remove(); throw error;
  }
}
