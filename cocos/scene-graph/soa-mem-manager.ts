import { type } from "os";
import { futimesSync } from "fs";

export const ARRAY_PACKED_FLOATS = 1;

export enum MemMgrType {
	MMT_NODE,
	MMT_OBJDATA,
	MMT_COUNT,
};

export enum SceneMemType {
	SMT_STATIC,
	SMT_DYNAMIC,
	SMT_COUNT,
};

export const IDX_SIZE = 1;
export const VEC3_SIZE = 3;
export const QUAT_SIZE = 4;
export const MAT4_SIZE = 16;

export class RebaseListener {
    constructor(){}

	buildDiffList(type, level, basePtrs, outDiffsList){}

    applyRebase(type, level, newBasePtrs, diffsList){}

    performCleanup(type, level, basePtrs, elementsMemSizes : number[], startInstance, diffInstances){}
}

export var cleanerFlat = function(pDst, indexDst, pSrc, indexSrc, slotCount, freeSlotCount, elmMemSize) {
}

export var cleanerSoAVec3 = function(pDst, indexDst, pSrc, indexSrc, slotCount, freeSlotCount, elmMemSize) {
}

export var cleanerSoAQuat = function(pDst, indexDst, pSrc, indexSrc, slotCount, freeSlotCount, elmMemSize) {
}

export var cleanerSoAMat4 = function(pDst, indexDst, pSrc, indexSrc, slotCount, freeSlotCount, elmMemSize) {

}

export class SoaMemManager {
    m_pListener : RebaseListener;
	m_type : MemMgrType;
	m_depthLevel : number;
	m_memSlotUsed : number;
	m_maxMemSlot : number;
	m_maxHardLimit : number;
	m_cleanupThreshold : number;
	m_totalMemSize : number;
	m_memPools : Float32Array[];
	m_elmMemSizes : number[];
	m_availableSlots : number[];
    m_cleanupRoutines;
    
    constructor(mtype: MemMgrType, elmMemSizes : number[],
        cleanupRoutines, elmMemSizeCount: number,
        depthLevel: number, maxNodeCount: number,
        cleanupThreshold: number, maxHardLimit: number,
        pListener) {
        this.m_pListener = pListener;
        this.m_type = mtype;
        this.m_depthLevel = depthLevel;
        this.m_memSlotUsed = 0;
        this.m_maxMemSlot = maxNodeCount;
        this.m_maxHardLimit = maxHardLimit;
        this.m_cleanupThreshold = cleanupThreshold;
        this.m_elmMemSizes = elmMemSizes;
        this.m_totalMemSize = 0;

        this.m_cleanupRoutines = cleanupRoutines;
        this.m_availableSlots = [];
        this.m_memPools = new Array(elmMemSizes.length);
        for (let item in this.m_elmMemSizes) {
            this.m_totalMemSize += this.m_elmMemSizes[item];
        }

        this.m_maxMemSlot = Math.max(2, this.m_maxMemSlot);

        // Round up max memory & hard limit to the next multiple of ARRAY_PACKED_REALS
        this.m_maxMemSlot = Math.floor((this.m_maxMemSlot + ARRAY_PACKED_FLOATS - 1) / ARRAY_PACKED_FLOATS) * ARRAY_PACKED_FLOATS;
        this.m_maxHardLimit = Math.floor((this.m_maxHardLimit + ARRAY_PACKED_FLOATS - 1) / ARRAY_PACKED_FLOATS) * ARRAY_PACKED_FLOATS;
    }

    initialize() {
        for(let i in this.m_elmMemSizes)
        {
            this.m_memPools[i] = new Float32Array(this.m_maxMemSlot * this.m_elmMemSizes[i]);
        }
    
        this.slotsRecreated( 0 );
    }

    slotsRecreated(index) {
    }

    getFreeMemory() {
	    return (this.m_maxMemSlot - this.m_memSlotUsed + this.m_availableSlots.length) * this.m_totalMemSize;
    }

    getUsedMemory() {
        return (this.m_memSlotUsed - this.m_availableSlots.length) * this.m_totalMemSize;
    }

    getWastedMemory() {
        return this.m_availableSlots.length * this.m_totalMemSize;
    }

    getTotalMemory() {
        return this.m_maxMemSlot * this.m_totalMemSize;
    }

    createNewSlot() {
        var nextSlot = this.m_memSlotUsed;
        ++this.m_memSlotUsed;

        //See if we can reuse a slot that was previously acquired and released
        if (this.m_availableSlots.length) {
            nextSlot = <number>this.m_availableSlots.pop();
            --this.m_memSlotUsed;
        }

        if (this.m_memSlotUsed > this.m_maxMemSlot) {
            // Build the diff list for rebase later.
            let diffsList = new Array(this.m_memSlotUsed);
            this.m_pListener.buildDiffList(this.m_type, this.m_depthLevel, this.m_memPools, diffsList);

            // Reallocate, grow by 50% increments, rounding up to next multiple of ARRAY_PACKED_FLOATS
            let newMemory = Math.floor(Math.min(this.m_maxMemSlot + (this.m_maxMemSlot >> 1), this.m_maxHardLimit));
            newMemory += (ARRAY_PACKED_FLOATS - newMemory % ARRAY_PACKED_FLOATS) % ARRAY_PACKED_FLOATS;
            newMemory = Math.min(newMemory, this.m_maxHardLimit);

            for (let i in this.m_memPools) {
                //Reallocate
                let newA = new Float32Array(newMemory * this.m_elmMemSizes[i]);
                for (let j in this.m_memPools[i]) {
                    newA[j] = this.m_memPools[i][j];
                }
                this.m_memPools[i] = newA;
            }

            let prevSlotCount = this.m_maxMemSlot;
            this.m_maxMemSlot = newMemory;

            //Rebase all ptrs
            this.m_pListener.applyRebase(this.m_type, this.m_depthLevel, this.m_memPools, diffsList);

            this.slotsRecreated(prevSlotCount);
        }

        return nextSlot;
    }

    destroySlot(slot, index) {
        if (slot + 1 == this.m_memSlotUsed) {
            //Lucky us, LIFO. We're done.
            --this.m_memSlotUsed;
        }
        else {
            //Not so lucky, add to "reuse" pool
            this.m_availableSlots.push(slot);

            //The pool is getting to big? Do some cleanup (depending
            //on fragmentation, may take a performance hit)
            if (this.m_availableSlots.length > this.m_cleanupThreshold) {
                //Sort, last values first. This may improve performance in some
                //scenarios by reducing the amount of data to be shifted
                this.m_availableSlots.sort(function (a, b) {
                    if (a > b)
                        return 1;
                    else if (a < b)
                        return -1;
                    else
                        return 0;
                });
                for (let i = 0; i < this.m_availableSlots.length;) {
                    //First see if we have a continuous range of unused slots
                    let lastRange = 1;
                    let next = i + 1;
                    while (next != this.m_availableSlots.length && (this.m_availableSlots[i] - lastRange) === this.m_availableSlots[next]) {
                        ++lastRange;
                        ++next;
                    }

                    let newEnd = this.m_availableSlots[i] + 1;

                    //Shift everything N slots (N = lastRange)
                    for (let j in this.m_memPools) {
                        let dst = (newEnd - lastRange) * this.m_elmMemSizes[j];
                        let indexDst = (newEnd - lastRange) % ARRAY_PACKED_FLOATS;
                        let src = newEnd * this.m_elmMemSizes[i];
                        let indexSrc = newEnd % ARRAY_PACKED_FLOATS;
                        let slotCount = (this.m_memSlotUsed - newEnd);
                        let freeSlotCount = lastRange;
                        this.m_cleanupRoutines[i](dst, indexDst, src, indexSrc, slotCount, freeSlotCount, this.m_elmMemSizes[i]);
                    }

                    this.m_memSlotUsed -= lastRange;
                    this.slotsRecreated(this.m_memSlotUsed);

                    this.m_pListener.performCleanup(this.m_type, this.m_depthLevel, this.m_memPools, this.m_elmMemSizes, (newEnd - lastRange), lastRange);
                    i += lastRange;
                }

                this.m_availableSlots = [];
            }
        } // if
    }
}