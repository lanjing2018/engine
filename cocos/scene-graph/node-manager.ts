import {NodeSoaMemManager} from './node-soamem-manager'
import {RebaseListener, SceneMemType, ARRAY_PACKED_FLOATS} from './soa-mem-manager'
import { Transform } from './transform';

export class  NodeManager extends RebaseListener {
	mtype;
    twinMemMgr;
	nodeMemMgrs : NodeSoaMemManager[];
    
    constructor(mtype) {
        super();
        this.mtype = mtype;
        this.nodeMemMgrs = [];
    }

    getType() {
        return this.mtype; 
    }
    getTwin() {
        return this.twinMemMgr;
    }
	setTwin(mtype, twinMemMgr) {
        this.mtype = mtype;
        this.twinMemMgr = twinMemMgr;
    }

    getDepth() {
        let retVal = 0;

        for(let i in this.nodeMemMgrs) {
            if(this.nodeMemMgrs[i].getUsedMemory()) {
                retVal = parseInt(i);
            }
        }
	    return retVal + 1;
    }

    getFirstNode(outTransform, depth) {
        return this.nodeMemMgrs[depth].getFirstNode(outTransform);
    }

	growToDepth(depth) {
        while( depth >= this.nodeMemMgrs.length )
	    {
		    this.nodeMemMgrs.push(new NodeSoaMemManager(this.mtype, /*m_pDummyNode,*/ this.nodeMemMgrs.length, 100, 100, this));
		    this.nodeMemMgrs[this.nodeMemMgrs.length - 1].initialize();
	    }
    }

	nodeCreated(outTransform, depth) {
        this.growToDepth(depth);
	    let mgr = this.nodeMemMgrs[depth];
	    mgr.createNode(outTransform);
    }

	nodeDestroyed(outTransform, depth) {
        let mgr = this.nodeMemMgrs[depth];
	    mgr.destroyNode( outTransform );
    }

	nodeAttached(outTransform, depth) {
        this.growToDepth(depth);
        let  transform = new Transform(this.nodeMemMgrs[depth]);
        this.nodeMemMgrs[depth].createNode(transform);

        transform.copy(outTransform);

        let mgr = this.nodeMemMgrs[0];
        mgr.destroyNode(outTransform);
        outTransform = transform;
    }

    nodeDetached(outTransform, depth) {
        let transform = new Transform(this.nodeMemMgrs[0]);
        this.nodeMemMgrs[0].createNode(transform);

        transform.copy(outTransform);
        transform.parents[transform.idx] = 0;

        let mgr = this.nodeMemMgrs[depth];
        mgr.destroyNode(outTransform);

        outTransform = transform;
    }

	nodeMoved(inOutTransform, oldDepth, newDepth) {
        this.growToDepth(newDepth);

        let transform = new Transform(this.nodeMemMgrs[newDepth]);
        this.nodeMemMgrs[newDepth].createNode(transform);

        transform.copy(inOutTransform);

        let mgr = this.nodeMemMgrs[oldDepth];
        mgr.destroyNode(inOutTransform);

        inOutTransform = transform;
    }

    migrateTo(inOutTransform, depth, pDstMemMgr) {
        let tmp = new Transform(pDstMemMgr);
        pDstMemMgr.nodeCreated(tmp, depth);
        tmp.copy(inOutTransform);
        this.nodeDestroyed(inOutTransform, depth);
        inOutTransform = tmp;
    }

	// Derived from RebaseListener
	buildDiffList(type, level, basePtrs, outDiffsList) {

    }

    applyRebase(type, level, newBasePtrs, diffsList) {
        let transform = new Transform(this.nodeMemMgrs[level]);
        let numNodes = this.getFirstNode(transform, level);

        for (let i = 0; i < numNodes; i += ARRAY_PACKED_FLOATS)
        {
            for (let j = 0; j < ARRAY_PACKED_FLOATS; ++j)
            {
                if (transform.owners()) {
                    //transform.owners[j].transform.idx = j;
                    //transform.owners[j].transform.soaOffset = transform.soaOffset;
                }
            }

            transform.advancePack();
        }
    }
	performCleanup(type, level, basePtrs, elementsMemSizes, startInstance, diffInstances) {
        let transform = new Transform(this.nodeMemMgrs[level]);
        let numNodes = this.getFirstNode(transform, level);

        let roundedStart = Math.floor(startInstance / ARRAY_PACKED_FLOATS);

        transform.advancePack(roundedStart);

        for (let i = Math.floor(roundedStart * ARRAY_PACKED_FLOATS); i < numNodes; i += ARRAY_PACKED_FLOATS)
        {
            for (let j = 0; j < ARRAY_PACKED_FLOATS; ++j)
            {
                if (transform.owners()) {
                    //transform.owners[j].transform.idx = j;
                    //transform.owners[j].transform.soaOffset = transform.soaOffset;
                }
            }

            transform.advancePack();
        }
    }
};