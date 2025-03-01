
interface IRoleSetting {
    [key:number]: number[]
}
export const roleSetting:IRoleSetting = {
    2: [1,2],
    3: [1,2,3],
    5: [1,1,2,3,4],
    6: [1,1,1,2,3,4],
    7: [1,1,1,2,2,3,4],
    8: [1,1,1,1,2,2,3,4],
}

interface IMissionSetting {
    [key:number]: number[]
}

export const missionSetting:IMissionSetting = {
    0: [2,3,2,3,3],
    1: [2,3,2,3,3],
    2: [2,3,2,3,3],
    3: [2,3,2,3,3],
    5: [2,3,2,3,3],
    6: [2,3,4,3,4],
    7: [2,3,3,4,4],
    8: [3,4,4,5,5],
    9: [3,4,4,5,5],
    10: [3,4,4,5,5]
}