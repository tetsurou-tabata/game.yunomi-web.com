import {roleSetting, missionSetting} from "@/app/define";

export const getRoleArray = ( member_num: number ) => {
    const cloneArray = [...roleSetting[member_num]]
    for (let i = cloneArray.length - 1; i >= 0; i--) {
        const rand = Math.floor(Math.random() * (i + 1))
        // 配列の要素の順番を入れ替える
        const tmpStorage = cloneArray[i]
        cloneArray[i] = cloneArray[rand]
        cloneArray[rand] = tmpStorage
    }
    return cloneArray
}

export const getMissionArray = ( member_num: number|null ) => {
    if( member_num === null ) return []
    const cloneArray = [...missionSetting[member_num]]
    return cloneArray;
}

export const stepToString = ( step: string|null ):string => {
    if (step === null) return ""
    switch (step) {
        case "formation":
            return "編成フェーズ"
        case "voting":
            return "投票フェーズ"
        case "mission":
            return "ミッションフェーズ"
        case "result":
            return "結果"
        default:
            return ""
    }
}