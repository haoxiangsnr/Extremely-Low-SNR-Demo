this.props = {
    energyThreshold: 50,
    intervalThreshold: 3
};

let arr = [];
for(let i = 1; i < 99; i++ ) {
    arr.push(Math.random())
}

this.state = {
        buffers : arr
};

const getSum = (arr, i, j) => {
    console.log(`本次求和起始和终止位置 ${i}, ${j}`);
    let sum = 0;
    i = i || 0;
    j = j || arr.length;

    if (i >= j)  return -1;
    while (i < j) {
        sum += arr[i] > 0 ? arr[i] : -arr[i];
        ++i
    }
    console.log(`求和结果如下：${sum}`);
    return sum;
};

const findEffectiveBuffer = () => {
    /*
    * input: OriginBuffer:[...]
    * return: {
    *     Container: [[effectiveBuffer1], [2], ...],
    *     prevTailArray: [...]
    * */

    const JudgedEffectiveBufferStore = [];
    const residualJudgedEffectiveBuffer = [];

    const { energyThreshold, intervalThreshold }= this.props;
    const originBuffer = this.state.buffers;

    const concatenatedBuffer = this.PREV_TAIL_BUFFER ?
        [...this.PREV_TAIL_BUFFER, ...originBuffer]:
        originBuffer;
    const concatenatedBufferLen = concatenatedBuffer.length;

    console.log("当前测试用例长度", concatenatedBufferLen);
    let i = 0, effectiveState = false;
    let effectiveBuffer = [];

    while (i + intervalThreshold < concatenatedBufferLen) {
        /*
        * 本次覆盖的范围为有效范围, 如果继续移动，范围终点就会超过concatenatedBufferLen，决策不进行下次移动
        * 设置残余了buffer，停止循环。
        * */
        console.log("当前轮次的起始位置：", i);
        let sumOfArrayInterval = getSum(concatenatedBuffer, i, i + intervalThreshold);

        if (sumOfArrayInterval > energyThreshold) {
            console.log("超过阈值");
            effectiveState = true;
            effectiveBuffer.push(...concatenatedBuffer.slice(i, i + intervalThreshold));
            i += intervalThreshold;
        }
        else {
            if (effectiveState) {
                console.log("没超过阈值，但是受到上一次的影响");
                effectiveBuffer.push(...concatenatedBuffer.slice(i, i + intervalThreshold));
                JudgedEffectiveBufferStore.push(effectiveBuffer);
                effectiveState = false;
                effectiveBuffer = []; // 识别一段语音结束
                i += intervalThreshold;
            }
            ++i;
        }
    }

    if (effectiveBuffer.length !== 0) {
        residualJudgedEffectiveBuffer.push(...effectiveBuffer);
    }

    console.log("最终i的位置：", i);
    console.log(concatenatedBuffer.slice(i));
    console.log({
        JudgedEffectiveBufferStore: JudgedEffectiveBufferStore,
        residual: {
            judgedEffectiveBuffer: residualJudgedEffectiveBuffer,
            noJudgedBuffer: concatenatedBuffer.slice(i)
        }
    });
};

findEffectiveBuffer();
