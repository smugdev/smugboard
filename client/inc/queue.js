var currBlockers = [];
var queuedStubs = [];

function resetBlockers(){
    currBlockers = [];
}

function resetStubs(){
    queuedStubs = [];
}

function pushBlocker(blocker){
    currBlockers.push(blocker);
}

function getBlockers(){
    return currBlockers;
}

function addToQueue(newFunc, newDeps){
    queuedStubs.push({func: newFunc, dependencies: newDeps});
    releaseQueued();
}

function releaseQueued(){
    var unsatisfiedDeps = [];
    for (let item of currBlockers){
        if (item.loaded == false && unsatisfiedDeps.indexOf(item.type) == -1){
            unsatisfiedDeps.push(item.type);
        }
    }
    
    var stillQueued = [];
    for (let item of queuedStubs){
        let depsSatisfied = true;
        for (let dep of item.dependencies){
            if (unsatisfiedDeps.indexOf(dep) != -1){
                depsSatisfied = false;
                break;
            }
        }
        if (depsSatisfied) {
            item.func();
        } else {
            stillQueued.push(item);
        }
    }
    
    queuedStubs = stillQueued;
}

module.exports.resetBlockers = resetBlockers;
module.exports.resetStubs = resetStubs;
module.exports.pushBlocker = pushBlocker;
module.exports.getBlockers = getBlockers;
module.exports.addToQueue = addToQueue;
module.exports.releaseQueued = releaseQueued;
