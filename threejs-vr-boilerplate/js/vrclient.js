window.VRClient = (function() {

  //used by camera and head-tracking elements
  var baseTransform = "translate3d(0, 0, 0) rotateZ(180deg) rotateY(180deg)";

  // helper function to convert a quaternion into a matrix, optionally
  // inverting the quaternion along the way
  function matrixFromOrientation(q, inverse) {
    var m = Array(16);

    var x = q.x, y = q.y, z = q.z, w = q.w;

    // if inverse is given, invert the quaternion first
    if (inverse) {
      x = -x; y = -y; z = -z;
      var l = Math.sqrt(x*x + y*y + z*z + w*w);
      if (l === 0) {
        x = y = z = 0;
        w = 1;
      } else {
        l = 1/l;
        x *= l; y *= l; z *= l; w *= l;
      }
    }

    var x2 = x + x, y2 = y + y, z2 = z + z;
    var xx = x * x2, xy = x * y2, xz = x * z2;
    var yy = y * y2, yz = y * z2, zz = z * z2;
    var wx = w * x2, wy = w * y2, wz = w * z2;

    m[0] = 1 - (yy + zz);
    m[4] = xy - wz;
    m[8] = xz + wy;

    m[1] = xy + wz;
    m[5] = 1 - (xx + zz);
    m[9] = yz - wx;

    m[2] = xz - wy;
    m[6] = yz + wx;
    m[10] = 1 - (xx + yy);

    m[3] = m[7] = m[11] = 0;
    m[12] = m[13] = m[14] = 0;
    m[15] = 1;

    return m;
  }

  function cssMatrixFromElements(e) {
    return "matrix3d(" + e.join(",") + ")";
  }

  function cssMatrixFromOrientation(q, inverse) {
    return cssMatrixFromElements(matrixFromOrientation(q, inverse));
  }

  function VRClient(container) {
    var self = this;

    // this promise resolves when VR devices are detected.
    self.getVR = new Promise(function (resolve, reject) {
      if (navigator.getVRDevices) {
        navigator.getVRDevices().then(function (devices) {
          for (var i = 0; i < devices.length; ++i) {
            if (devices[i] instanceof HMDVRDevice && !self.hmdDevice) {
              self.hmdDevice = devices[i];
            }
            if (devices[i] instanceof PositionSensorVRDevice &&
                devices[i].hardwareUnitId == self.hmdDevice.hardwareUnitId &&
                !self.positionDevice) {
              self.positionDevice = devices[i];
              break;
            }
          }
          if (self.hmdDevice && self.positionDevice) {
            console.log('VR devices detected');
            resolve({
              hmd: self.hmdDevice,
              position: self.positionDevice
            });
            return;
          }
          reject('no VR devices found!');
        }).catch(reject);
      } else {
        reject('no VR implementation found!');
      }
    });

    self.wait = new Promise(function (resolve) {
      self.startDemo = resolve;
    });

    window.addEventListener("message", function (e) {
      var msg = e.data;
      if (!msg.type) {
        return;
      }
      switch (msg.type) {
        case 'start':
          self.startDemo();
          break;
      }
    }, false);
  }

  VRClient.prototype.sendMessage = function (type, data) {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: type,
        data: data
      }, '*');
    }
  };

  VRClient.prototype.load = function (url) {
    this.sendMessage('load', url);
  };

  // Takes value 0..1 to represent demo load progress. Optional.
  VRClient.prototype.progress = function (val) {
    this.sendMessage('progress', val);
  };

  // Notifies VRManager that demo is ready. Required.
  VRClient.prototype.ready = function () {
    this.sendMessage('ready');
    return this.wait;
  };

  // if this demo has an exit
  VRClient.prototype.ended = function() {
    this.sendMessage('ended');
  }

  VRClient.prototype.getVR = function () {
    return this.getVR;
  };

  VRClient.prototype.zeroSensor = function () {
    var self = this;
    self.getVR.then(function () {
      self.positionDevice.zeroSensor();
    });
  };

  return new VRClient();

})();
