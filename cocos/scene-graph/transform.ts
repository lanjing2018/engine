import {ARRAY_PACKED_FLOATS, VEC3_SIZE, QUAT_SIZE, MAT4_SIZE, SoaMemManager} from './soa-mem-manager'
import {vec3} from '../core/vmath/vec3'
import {quat} from '../core/vmath/quat'
import {mat4} from '../core/vmath/mat4'


export enum TransformMemoryType {
	TMT_PARENT = 0,
	TMT_OWNER,
	TMT_POSITION,
	TMT_ROTATION,
	TMT_SCALE,
	TMT_WORLD_POSITION,
	TMT_WORLD_ROTATION,
	TMT_WORLD_SCALE,
	TMT_WORLD_MATRIX,
	TMT_COUNT
}

export class Transform {
    idx : number = 0;
    soaOffset : number = 0;
    depth : number = 0;
    memMgr : SoaMemManager;

    constructor(mMgr,idx = 0, soaOffset = 0, depth = 0) {
        this.idx = idx;
        this.soaOffset = soaOffset;
        this.depth = depth;
        this.memMgr = mMgr;
    }
	// Holds the pointers to each parent. Ours is mParents[mIndex]
	parents() {
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_PARENT];
        return arr[this.soaOffset * ARRAY_PACKED_FLOATS + this.idx];
    }

	// The Node that owns this Transform. Ours is mOwner[mIndex]
	owners() {
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_OWNER];
        return arr[this.soaOffset * ARRAY_PACKED_FLOATS + this.idx];
    }

	// Stores the position/translation of a node relative to its parent.
	positions() {
        let out = vec3.create();
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_POSITION];
    
        out.x = arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + this.idx];
        out.y = arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + ARRAY_PACKED_FLOATS + this.idx];
        out.z = arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + ARRAY_PACKED_FLOATS * 2 + this.idx];

        return out;
    }

	// Stores the orientation of a node relative to it's parent.
	rotations() {
        let out = quat.create();
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_ROTATION];
       
        out.x = arr[this.soaOffset * ARRAY_PACKED_FLOATS * QUAT_SIZE + this.idx];
        out.y = arr[this.soaOffset * ARRAY_PACKED_FLOATS * QUAT_SIZE + ARRAY_PACKED_FLOATS + this.idx];
        out.z = arr[this.soaOffset * ARRAY_PACKED_FLOATS * QUAT_SIZE + ARRAY_PACKED_FLOATS * 2 + this.idx];
        out.w = arr[this.soaOffset * ARRAY_PACKED_FLOATS * QUAT_SIZE + ARRAY_PACKED_FLOATS * 3 + this.idx];

        return out;
    }

	// Stores the scaling factor applied to a node
	scales() {
        let out = vec3.create();
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_SCALE];
        
        out.x = arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + this.idx];
        out.y = arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + ARRAY_PACKED_FLOATS + this.idx];
        out.z = arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + ARRAY_PACKED_FLOATS * 2 + this.idx];

        return out;
    }

	// Caches the combined position from all parent nodes.
	worldPositions() {
        let out = vec3.create();
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_WORLD_POSITION];
       
        out.x = arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + this.idx];
        out.y = arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + ARRAY_PACKED_FLOATS + this.idx];
        out.z = arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + ARRAY_PACKED_FLOATS * 2 + this.idx];

        return out;
    }

	// Caches the combined orientation from all parent nodes.
	worldRotations() {
        let out = quat.create();
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_WORLD_ROTATION];
        
        out.x = arr[this.soaOffset * ARRAY_PACKED_FLOATS * QUAT_SIZE + this.idx];
        out.y = arr[this.soaOffset * ARRAY_PACKED_FLOATS * QUAT_SIZE + ARRAY_PACKED_FLOATS + this.idx];
        out.z = arr[this.soaOffset * ARRAY_PACKED_FLOATS * QUAT_SIZE + ARRAY_PACKED_FLOATS * 2 + this.idx];
        out.w = arr[this.soaOffset * ARRAY_PACKED_FLOATS * QUAT_SIZE + ARRAY_PACKED_FLOATS * 3 + this.idx];

        return out;
    }

	// Caches the combined scale from all parent nodes.
	worldScales() {
        let out = vec3.create();
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_WORLD_SCALE];

        out.x = arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + this.idx];
        out.y = arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + ARRAY_PACKED_FLOATS + this.idx];
        out.z = arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + ARRAY_PACKED_FLOATS * 2 + this.idx];

        return out;
    }

	// Caches the full transform into a 4x4 matrix.
	matWorlds(){
        let out = mat4.create();
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_WORLD_MATRIX];

        out.m00 = arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + this.idx];
        out.m01 = arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS + this.idx];
        out.m02 = arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 2 + this.idx];
        out.m03 = arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 3 + this.idx];
        out.m04 = arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 4 + this.idx];
        out.m05 = arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 5 + this.idx];
        out.m06 = arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 6 + this.idx];
        out.m07 = arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 7 + this.idx];
        out.m08 = arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 8 + this.idx];
        out.m09 = arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 9 + this.idx];
        out.m10 = arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 10 + this.idx];
        out.m11 = arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 11 + this.idx];
        out.m12 = arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 12 + this.idx];
        out.m13 = arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 13 + this.idx];
        out.m14 = arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 14 + this.idx];
        out.m15 = arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 15 + this.idx];
        
        return out;
    }

    setParents(val) {
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_PARENT];
        arr[this.soaOffset * ARRAY_PACKED_FLOATS + this.idx] = val;
    }

	setOwners(val) {
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_OWNER];
        arr[this.soaOffset * ARRAY_PACKED_FLOATS + this.idx] = val;
    }

	setPositions(val : vec3) {
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_POSITION];

        arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + this.idx] = val.x;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + ARRAY_PACKED_FLOATS + this.idx] = val.y;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + ARRAY_PACKED_FLOATS * 2 + this.idx] = val.z;
    }

	setRotations(val : quat) {
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_ROTATION];

        arr[this.soaOffset * ARRAY_PACKED_FLOATS * QUAT_SIZE + this.idx] = val.x;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * QUAT_SIZE + ARRAY_PACKED_FLOATS + this.idx] = val.y;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * QUAT_SIZE + ARRAY_PACKED_FLOATS * 2 + this.idx] = val.z;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * QUAT_SIZE + ARRAY_PACKED_FLOATS * 3 + this.idx] = val.w;
    }

	setScales(val : vec3) {
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_SCALE];

        arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + this.idx] = val.x;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + ARRAY_PACKED_FLOATS + this.idx] = val.y;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + ARRAY_PACKED_FLOATS * 2 + this.idx] = val.z;
    }

	setWorldPositions(val : vec3) {
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_WORLD_POSITION];

        arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + this.idx] = val.x;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + ARRAY_PACKED_FLOATS + this.idx] = val.y;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + ARRAY_PACKED_FLOATS * 2 + this.idx] = val.z;
    }

	setWorldRotations(val :quat) {
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_WORLD_ROTATION];

        arr[this.soaOffset * ARRAY_PACKED_FLOATS * QUAT_SIZE + this.idx] = val.x;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * QUAT_SIZE + ARRAY_PACKED_FLOATS + this.idx] = val.y;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * QUAT_SIZE + ARRAY_PACKED_FLOATS * 2 + this.idx] = val.z;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * QUAT_SIZE + ARRAY_PACKED_FLOATS * 3 + this.idx] = val.w;
    }

	setWorldScales(val : vec3) {
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_WORLD_SCALE];

        arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + this.idx] = val.x;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + ARRAY_PACKED_FLOATS + this.idx] = val.y;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * VEC3_SIZE + ARRAY_PACKED_FLOATS * 2 + this.idx] = val.z;
    }

	setMatWorlds(val : mat4){
        var arr = this.memMgr.m_memPools[TransformMemoryType.TMT_WORLD_MATRIX];

        arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + this.idx] = val.m00;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS + this.idx] = val.m01;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 2 + this.idx] = val.m02;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 3 + this.idx] = val.m03;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 4 + this.idx] = val.m04;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 5 + this.idx] = val.m05;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 6 + this.idx] = val.m06;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 7 + this.idx] = val.m07;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 8 + this.idx] = val.m08;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 9 + this.idx] = val.m09;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 10 + this.idx] = val.m10;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 11 + this.idx] = val.m11;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 12 + this.idx] = val.m12;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 13 + this.idx] = val.m13;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 14 + this.idx] = val.m14;
        arr[this.soaOffset * ARRAY_PACKED_FLOATS * MAT4_SIZE + ARRAY_PACKED_FLOATS * 15 + this.idx] = val.m15;
    }
    copy(inCopy : Transform) {
        this.setParents(inCopy.parents());
        this.setOwners(inCopy.owners());

        //Position
		this.setPositions(inCopy.positions());

        //Orientation
		this.setRotations(inCopy.rotations());

        //Scale
		this.setScales(inCopy.scales());

        //Derived position
		this.setWorldPositions(inCopy.worldPositions());

        //Derived orientation
		this.setWorldRotations(inCopy.worldRotations());

        //Derived scale
		this.setWorldScales(inCopy.worldScales());

		this.setMatWorlds(inCopy.matWorlds());
    }

	rebase(memMgr, soaOffset, idx) {
        this.memMgr = memMgr;
        this.soaOffset = soaOffset;
        this.idx = idx;
	}

    advancePack(numAdvance = 1) {
		this.soaOffset = numAdvance;
	}
}