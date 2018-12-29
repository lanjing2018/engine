import { vec3, mat4, quat } from '../core/vmath';
import BaseNode from './base-node';
import Layers from './layers';
import { EventTarget } from "../core/event";
import { ccclass, property, mixins } from '../core/data/class-decorator';
import { Scene } from './scene'
import { Transform } from './transform'

let v3_a = vec3();
let q_a = quat();
let array_a = new Array(10);

let EventType = {
    TRANSFORM_CHANGED: 'transform-changed',
    POSITION_PART: 1,
    ROTATION_PART: 2,
    SCALE_PART: 4
}

@ccclass('cc.Node')
@mixins(EventTarget)
export class Node extends BaseNode {
    // transform
    _transform = new Transform(null);

    _layer = Layers.Default; // the layer this node belongs to

    _euler = vec3.create(); // local rotation in euler angles, maintained here so that rotation angles could be greater than 360 degree.

    _matDirty = true;
    _dirty = false; // does the world transform need to update?
    _hasChanged = false; // has the transform changed in this frame?

    // is node but not scene
    static isNode(obj) {
        return obj instanceof Node && (obj.constructor === Node || !(obj instanceof Scene));
    }

    static EventType = EventType;

    constructor(name) {
        super(name);
        EventTarget.call(this);
    }


    // ===============================
    // hierarchy
    // ===============================

    /**
     * invalidate all children after relevant events
     */
    onRestore() {
        super.onRestore();
        this.invalidateChildren();
    }

    _onSetParent(/*oldParent*/) {
        this.invalidateChildren();
    }

    _onPostActivated() {
        this.invalidateChildren();
    }

    // ===============================
    // transform helper
    // ===============================

    /**
     * Set rotation by lookAt target point
     * @param {vec3} pos target position
     * @param {vec3} up the up vector, default to (0,1,0)
     */
    lookAt(pos, up) {
        this.getWorldPosition(v3_a);
        vec3.sub(v3_a, v3_a, pos); // NOTE: we use -z for view-dir
        vec3.normalize(v3_a, v3_a);
        quat.fromViewUp(q_a, v3_a, up);

        this._transform.setWorldRotations(q_a);
    }

    /**
     * Reset the `hasChanged` flag recursively
     */
    resetHasChanged() {
        this._hasChanged = false;
        let len = this._children.length;
        for (let i = 0; i < len; ++i) {
            this._children[i].resetHasChanged();
        }
    }

    /**
     * invalidate the world transform information
     * for this node and all its children recursively
     */
    invalidateChildren() {
        if (this._dirty && this._hasChanged) return;
        this._dirty = this._hasChanged = true;

        let len = this._children.length;
        for (let i = 0; i < len; ++i) {
            this._children[i].invalidateChildren();
        }
    }

    /**
     * update the world transform information if outdated
     */
    updateWorldTransform() {
        if (!this._dirty) return;
        let cur = this, child, i = 0;
        while (cur._dirty) {
            // top level node
            array_a[i++] = cur;
            cur = cur._parent;
            if (!cur || cur.isLevel) {
                cur = null;
                break;
            }
        }
        let wpos = vec3.create(), wrot = vec3.create(), wscale = vec3.create(1,1,1,);
        while (i) {
            child = array_a[--i];
            if (cur) {
                vec3.mul(wpos, child._transform.positions(), cur._transform.worldScales());
                vec3.transformQuat(wpos, wpos, cur._transform.worldRotations());
                vec3.add(wpos, wpos, cur._transform.worldPositions());
                quat.mul(wrot, cur._transform.worldRotations(), child._transform.rotations());
                vec3.mul(wscale, cur._transform.worldScales(), child._transform.scales());

                child._transform.setWorldPosition(wpos);
                child._transform.setWorldRotation(wrot);
                child._transform.setWorldScale(wscale);
            }
            child._matDirty = true; // further deferred eval
            child._dirty = false;
            cur = child;
        }
    }

    updateWorldTransformFull() {
        this.updateWorldTransform();
        if (!this._matDirty) return;
        let mat = mat4.create();
        mat4.fromRTS(mat, this._transfrom.worldRotations(), this._transform.worldPositions(), this._transform.worldScales());
        this._transform.setMatWorlds(mat);
        this._matDirty = false;
    }


    // ===============================
    // transform
    // ===============================

    /**
     * set local position
     * @param {vec3|number} val the new local position, or the x component of it
     * @param {number} [y] the y component of the new local position
     * @param {number} [z] the z component of the new local position
     */
    setPosition(val, y, z) {
        if (arguments.length === 1) {
            this._transform.setPositions(val);
            this._transform.setWorldPositions(val)
        } else if (arguments.length === 3) {
            this._transform.setPositions(vec3.create(val,y,z));
            this._transform.setWorldPositions(vec3.create(val,y,z))
        }

        this.emit(EventType.TRANSFORM_CHANGED, EventType.POSITION_PART);
        this.invalidateChildren();
    }

    /**
     * get local position
     * @param {vec3} [out] the receiving vector
     * @return {vec3} the resulting vector
     */
    getPosition(out) {
        let pos = this._transform.positions();
        if (out) {
            return vec3.set(out, pos.x, this.pos.y, this.pos.z);
        } else {
            return vec3.copy(cc.v3(), pos);
        }
    }

    /**
     * set local rotation
     * @param {quat|number} val the new local rotation, or the x component of it
     * @param {number} [y] the y component of the new local rotation
     * @param {number} [z] the z component of the new local rotation
     * @param {number} [w] the w component of the new local rotation
     */
    setRotation(val, y, z, w) {
        let rot = quat.create();
        if (arguments.length === 1) {
            quat.copy(rot, val);
        } else if (arguments.length === 4) {
            quat.set(rot, val, y, z, w);
        }

        this._transform.setRotations(rot);
        this._transform.setWorldRotations(rot);
        this.syncEuler();

        this.emit(EventType.TRANSFORM_CHANGED, EventType.ROTATION_PART);
        this.invalidateChildren();
    }

    /**
     * set local rotation from euler angles
     * @param {number} x - Angle to rotate around X axis in degrees.
     * @param {number} y - Angle to rotate around Y axis in degrees.
     * @param {number} z - Angle to rotate around Z axis in degrees.
     */
    setRotationFromEuler(x, y, z) {
        let rot = quat.create();
        vec3.set(this._euler, x, y, z);
        quat.fromEuler(rot, x, y, z);
        this._transform.setRotations(rot);
        this._transform.setWorldRotations(rot);

        this.emit(EventType.TRANSFORM_CHANGED, EventType.ROTATION_PART);
        this.invalidateChildren();
    }

    /**
     * get local rotation
     * @param {quat} [out] the receiving quaternion
     * @return {quat} the resulting quaternion
     */
    getRotation(out) {
        let rot = this._transform.rotations();
        if (out) {
            return quat.set(out, rot.x, rot.y, rot.z, rot.w);
        } else {
            return quat.copy(cc.quat(), rot);
        }
    }

    /**
     * set local scale
     * @param {vec3|number} val the new local scale, or the x component of it
     * @param {number} [y] the y component of the new local scale
     * @param {number} [z] the z component of the new local scale
     */
    setScale(val, y, z) {
        let scale = vec3.create();
        if (arguments.length === 1) {
            vec3.copy(scale, val);
        } else if (arguments.length === 3) {
            vec3.set(scale, val, y, z);
        }
        this._transform.setScales(scale);
        this._transform.setWorldScales(scale);

        this.emit(EventType.TRANSFORM_CHANGED, EventType.SCALE_PART);
        this.invalidateChildren();
    }

    /**
     * get local scale
     * @param {vec3} [out] the receiving vector
     * @return {vec3} the resulting vector
     */
    getScale(out) {
        let scale = this._transform.scales();
        if (out) {
            return vec3.set(out, scale.x, scale.y, scale.z);
        } else {
            return vec3.copy(cc.v3(), scale);
        }
    }

    /**
     * set world position
     * @param {vec3|number} val the new world position, or the x component of it
     * @param {number} [y] the y component of the new world position
     * @param {number} [z] the z component of the new world position
     */
    setWorldPosition(val, y, z) {
        let pos = vec3.create(), lpos = vec3.create();
        if (arguments.length === 1) {
            vec3.copy(pos, val);
        } else if (arguments.length === 3) {
            vec3.set(pos, val, y, z);
        }
        if (this._parent) {
            this._parent.getWorldPosition(v3_a);
            vec3.sub(lpos, pos, v3_a);
            this._transform.setPositions(lpos);
        } else {
            this.setPosition(pos);
        }

        this._transform.setWorldPositions(pos);

        this.emit(EventType.TRANSFORM_CHANGED, EventType.POSITION_PART);
        this.invalidateChildren();
    }

    /**
     * get world position
     * @param {vec3} [out] the receiving vector
     * @return {vec3} the resulting vector
     */
    getWorldPosition(out) {
        this.updateWorldTransform();
        let pos = this._transform.worldPositions();
        if (out) {
            return vec3.copy(out, pos);
        } else {
            return vec3.copy(cc.v3(), pos);
        }
    }

    /**
     * set world rotation
     * @param {quat|number} val the new world rotation, or the x component of it
     * @param {number} [y] the y component of the new world rotation
     * @param {number} [z] the z component of the new world rotation
     * @param {number} [w] the w component of the new world rotation
     */
    setWorldRotation(val, y, z, w) {
        let rot = quat.create(), lrot = quat.create();
        if (arguments.length === 1) {
            quat.copy(rot, val);
        } else if (arguments.length === 4) {
            quat.set(rot, val, y, z, w);
        }
        if (this._parent) {
            this._parent.getWorldRotation(q_a);
            quat.mul(lrot, rot, quat.conjugate(q_a, q_a));
            this._transform.setRotations(lrot);
        } else {
            this._transform.setRotations(rot);
        }

        this._transform.setWorldRotations(rot);
        this.syncEuler();

        this.emit(EventType.TRANSFORM_CHANGED, EventType.ROTATION_PART);
        this.invalidateChildren();
    }

    /**
     * set world rotation from euler angles
     * @param {number} x - Angle to rotate around X axis in degrees.
     * @param {number} y - Angle to rotate around Y axis in degrees.
     * @param {number} z - Angle to rotate around Z axis in degrees.
     */
    setWorldRotationFromEuler(x, y, z) {
        vec3.set(this._euler, x, y, z);

        let rot = quat.create(), lrot = quat.create();
        quat.fromEuler(rot, x, y, z);
        if (this._parent) {
            this._parent.getWorldRotation(q_a);
            quat.mul(lrot, rot, quat.conjugate(q_a, q_a));
            this._transform.setRotations(lrot);
        } else {
            this._transform.setRotations(rot);
        }
        this._transform.setWorldRotations(rot);

        this.emit(EventType.TRANSFORM_CHANGED, EventType.ROTATION_PART);
        this.invalidateChildren();
    }

    /**
     * get world rotation
     * @param {quat} [out] the receiving quaternion
     * @return {quat} the resulting quaternion
     */
    getWorldRotation(out) {
        this.updateWorldTransform();
        let rot = this._transform.worldRotations();
        if (out) {
            return quat.copy(out, rot);
        } else {
            return quat.copy(cc.quat(), rot);
        }
    }

    /**
     * set world scale
     * @param {vec3|number} val the new world scale, or the x component of it
     * @param {number} [y] the y component of the new world scale
     * @param {number} [z] the z component of the new world scale
     */
    setWorldScale(val, y, z) {
        let lscale = vec3.create(), scale = vec3.create();
        if (arguments.length === 1) {
            vec3.copy(scale, val);
        } else if (arguments.length === 3) {
            vec3.set(scale, val, y, z);
        }
        if (this._parent) {
            this._parent.getWorldScale(v3_a);
            vec3.div(lscale, scale, v3_a);
            this._transform.setScales(lscale);
        } else {
            this._transform.setScales(scale);
        }
        this._transform.setWorldScales(scale);

        this.emit(EventType.TRANSFORM_CHANGED, EventType.SCALE_PART);
        this.invalidateChildren();
    }

    /**
     * get world scale
     * @param {vec3} [out] the receiving vector
     * @return {vec3} the resulting vector
     */
    getWorldScale(out) {
        this.updateWorldTransform();
        let scale = this._transform.worldScales();
        if (out) {
            return vec3.copy(out, scale);
        } else {
            return vec3.copy(cc.v3(), scale);
        }
    }

    /**
     * get the matrix that transforms a point from local space into world space
     * @param {mat4} [out] the receiving matrix
     * @return {mat4} the resulting matrix
     */
    getWorldMatrix(out) {
        this.updateWorldTransformFull();
        if (out) {
            return mat4.copy(out, this._mat);
        } else {
            return mat4.copy(cc.mat4(), this._mat);
        }
    }

    /**
     * get world transform matrix (with only rotation and scale)
     * @param {mat4} [out] the receiving matrix
     * @return {mat4} the resulting matrix
     */
    getWorldRS(out) {
        this.updateWorldTransformFull();
        if (out) {
            mat4.copy(out, this._mat);
        } else {
            out = mat4.copy(cc.mat4(), this._mat);
        }
        out.m12 = 0; out.m13 = 0; out.m14 = 0;
        return out;
    }

    /**
     * get world transform matrix (with only rotation and translation)
     * @param {mat4} [out] the receiving matrix
     * @return {mat4} the resulting matrix
     */
    getWorldRT(out) {
        this.updateWorldTransform();
        if (!out) {
            out = cc.mat4();
        }
        return mat4.fromRT(out, this._rot, this._pos);
    }
}

if (CC_EDITOR) {
    let repeat = (t, l) => t - Math.floor(t / l) * l;
    Node.prototype.syncEuler = function() {
        let eu = this._euler;
        quat.toEuler(v3_a, this._lrot);
        eu.x = repeat(v3_a.x - eu.x + 180, 360) + eu.x - 180;
        eu.y = repeat(v3_a.y - eu.y + 180, 360) + eu.y - 180;
        eu.z = repeat(v3_a.z - eu.z + 180, 360) + eu.z - 180;
    };
    let desc = {
        set(val) {
            this.setRotationFromEuler(val.x, val.y, val.z);
        },
        get() {
            return this._euler;
        }
    };
    Object.defineProperty(Node.prototype, 'eulerAngles', desc);
} else Node.prototype.syncEuler = function() {};

cc.Node = Node;
export default Node;