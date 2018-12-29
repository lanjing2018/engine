import {ARRAY_PACKED_FLOATS, IDX_SIZE, VEC3_SIZE, QUAT_SIZE, MAT4_SIZE, cleanerFlat, cleanerSoAVec3, cleanerSoAQuat, cleanerSoAMat4, SoaMemManager, MemMgrType} from './soa-mem-manager'
import {TransformMemoryType, Transform} from './transform'
import {vec3} from '../core/vmath/vec3'
import {quat} from '../core/vmath/quat'
import {mat4} from '../core/vmath/mat4'

const ElEMENT_MEMORY_SIZES  =
[
	IDX_SIZE,	// parent
	IDX_SIZE,	// owner
	VEC3_SIZE ,		// position
	QUAT_SIZE,		// rotation
	VEC3_SIZE,		// scale
	VEC3_SIZE,		// world position
	QUAT_SIZE,		// world rotation
	VEC3_SIZE,		// world scale
	MAT4_SIZE,		// world matrix
];

const NodeCleanupRoutines = [
	cleanerFlat,		// parent
	cleanerFlat,		// owner
	cleanerSoAVec3,		// position
	cleanerSoAQuat,		// rotation
	cleanerSoAVec3,		// scale
	cleanerSoAVec3,		// world position
	cleanerSoAQuat,		// world rotation
	cleanerSoAVec3,		// world scale
	cleanerSoAMat4,		// world matrix
];

export class NodeSoaMemManager extends SoaMemManager {
    constructor(type, /*pDummyNode,*/ depthLevel, maxNodeCount, cleanupThreshold, pListener) {
        super(MemMgrType.MMT_NODE, ElEMENT_MEMORY_SIZES, NodeCleanupRoutines, ElEMENT_MEMORY_SIZES.length, depthLevel, maxNodeCount, cleanupThreshold, 10000, pListener);
    }

    createNode(outTransform: Transform) {
        let nextSlot = this.createNewSlot();
        let nextSlotIdx = nextSlot % ARRAY_PACKED_FLOATS;
        let nextSlotBase = nextSlot - nextSlotIdx;

        //Set memory ptrs
        outTransform.idx = nextSlotIdx;
        outTransform.soaOffset = Math.floor(nextSlot / ARRAY_PACKED_FLOATS);
        outTransform.memMgr = this;
        outTransform.depth = this.m_depthLevel;

        //Set default values
        outTransform.setParents(0);
        outTransform.setOwners(0);
        outTransform.setPositions(vec3.zero());
        outTransform.setRotations(quat.create());
        outTransform.setScales(vec3.create(1, 1, 1));
        outTransform.setWorldPositions(vec3.zero());
        outTransform.setWorldRotations(quat.create());
        outTransform.setWorldScales(vec3.create(1, 1, 1));
        outTransform.setMatWorlds(mat4.create());
    }

    destroyNode(inOutTransform) {
        this.destroySlot(inOutTransform.soaOffset * ARRAY_PACKED_FLOATS + inOutTransform.idx, inOutTransform.idx);
        //Zero out all pointers
        inOutTransform = new Transform(this);
    }

    getFirstNode(outTransform) {
        outTransform.soaOffset = 0;
        outTransform.idx = 0;
        outTransform.depth = this.m_depthLevel;
        outTransform.memMgr = this;


        return this.m_memSlotUsed;
    }

    slotsRecreated(prevSlotCount) {
        super.slotsRecreated(prevSlotCount);
    }
}