const os = require('os');
function getLocalIP() {
  const interfaces = os.networkInterfaces();

  const preferNames = ['Wi-Fi', 'Ethernet', 'en0', 'eth0']; // Thêm theo OS
  for (const preferred of preferNames) {
    const ifaceList = interfaces[preferred];
    if (!ifaceList) continue;

    for (const iface of ifaceList) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  // fallback: pick the first valid one not in skip list
  const skipNames = ['WSL', 'Docker', 'vEthernet'];
  for (const name in interfaces) {
    if (skipNames.some((skip) => name.includes(skip))) continue;

    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return 'localhost';
}

module.exports = getLocalIP;
