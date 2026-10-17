// Cane "a ritagli": corpo + coppie di zampe ruotate attorno a spalla/anca, ricavati dalle foto vere.
const DogRig = (() => {
  const cache = {};

  function load(key, base, rig) {
    const parts = { body: new Image() };
    parts.body.src = `${base}_body.png`;
    for (const leg of rig.legs) { parts[leg.name] = new Image(); parts[leg.name].src = `${base}_${leg.name}.png`; }
    cache[key] = { rig, parts };
  }

  function ready(key) {
    const c = cache[key];
    return !!c && Object.values(c.parts).every(im => im.complete && im.naturalWidth);
  }

  // Copie dei pezzi già rimpicciolite alla misura esatta dello schermo (fatte una volta sola):
  // rimpicciolire le immagini a ogni fotogramma con la qualità alta è lento sui telefoni.
  function scaledParts(c, factor) {
    if (c.scaled && c.scaled.factor === factor) return c.scaled.parts;
    const out = {};
    for (const [name, im] of Object.entries(c.parts)) {
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(im.naturalWidth * factor));
      cv.height = Math.max(1, Math.round(im.naturalHeight * factor));
      const g = cv.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(im, 0, 0, cv.width, cv.height);
      out[name] = cv;
    }
    c.scaled = { factor, parts: out };
    return out;
  }

  // pose: { run: fase corsa (rad) o null, air: -1..1 (salita/discesa) o null, crouch: bool }
  // disegna con i piedi centrati in (0,0) del contesto attuale, larghezza finale = rig.width * scale
  function draw(ctx, key, pose, scale) {
    if (!ready(key)) return false;
    const { rig, parts: orig } = cache[key];
    const factor = Math.round(scale * (ctx.getTransform().a || 1) * 1000) / 1000;
    const parts = scaledParts(cache[key], factor);
    const W = name => orig[name].naturalWidth, H = name => orig[name].naturalHeight;
    const angles = {};
    let tilt = 0;
    if (pose.air != null) {
      angles.front = -0.55; angles.hind = 0.6;
      tilt = pose.air < 0 ? -0.12 : 0.08;
    } else if (pose.run != null) {
      const s = Math.sin(pose.run);
      angles.front = -s * 0.42; angles.hind = s * 0.42;
    } else {
      angles.front = 0; angles.hind = 0;
    }

    // quanto si abbassa il corpo: in corsa per tenere le zampe a terra, abbassata per piegarle
    let drop = 0;
    if (pose.crouch) { drop = Math.min(...rig.legs.map(l => rig.groundY - l.pivot[1])) * 0.7; tilt = 0.06; }
    else if (pose.air == null) drop = Math.min(...rig.legs.map(l => (rig.groundY - l.pivot[1]) * (1 - Math.cos(angles[l.name] || 0))));

    ctx.save();
    ctx.scale(scale, scale);
    ctx.rotate(tilt);
    ctx.translate(-rig.centerX, -rig.groundY + drop);
    for (const leg of rig.legs) {
      const [px, py] = leg.pivot;
      const reach = rig.groundY - py;
      const k = (pose.crouch ? (reach - drop) / reach : 1) * (leg.stretch || 1);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angles[leg.name] || 0);
      ctx.scale(1, k);
      ctx.drawImage(parts[leg.name], leg.x - px, leg.y - py, W(leg.name), H(leg.name));
      ctx.restore();
    }
    ctx.drawImage(parts.body, 0, 0, W('body'), H('body'));
    ctx.restore();
    return true;
  }

  return { load, ready, draw };
})();
