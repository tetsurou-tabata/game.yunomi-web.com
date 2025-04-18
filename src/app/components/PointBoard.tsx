import { Database } from "@/types/supabasetype"
import { stepToString } from "@/app/functions";
import { Flex, Text, Paper } from '@mantine/core';
import { getMissionArray } from "@/app/functions";

type RoomInfo = Database["public"]["Tables"]["t_room"]["Row"];

interface Props {
    roomInfo: RoomInfo;
}

export default function PointBoard(props: Props) {

    const roomInfo = props.roomInfo;
    const stepString = stepToString(roomInfo.step);
    const missionArray = getMissionArray(roomInfo.member_num);
    const voteCountArray = [1, 2, 3, 4, 5];

    return (
        <Paper className="board" withBorder shadow="xs" p="lg" mb="xl">
            <Text fw={500} mb="sm">{stepString}</Text>
            <Flex justify={'space-between'} gap={"3%"} className="quest" mb="md">
                {missionArray.map((_, index) => {
                    const turnIndex = `turn0${index + 1}`;
                    let iconClass = "init";
                    const result: number = roomInfo[turnIndex as keyof typeof roomInfo] as number;
                    if (result == 0) {
                        iconClass = "blue"
                    }
                    if (result > 0) {
                        iconClass = "red"
                    }
                    return (
                        <div key={index} className={`quest-icon ${iconClass} ${roomInfo.turn == index + 1 ? "current" : ""}`}>
                            {result != -1 ? (
                                <>
                                    <p>{result}</p>
                                    <span className="sep"></span>
                                    <p>{missionArray[index]}</p>
                                </>
                            ) : (
                                <p>{missionArray[index]}</p>
                            )}
                        </div>
                    )
                })}
            </Flex>
            <Text fw={500} mb="xs">投票カウンタ</Text>
            <Flex justify={'start'} gap={"3%"} className="quest">
                {voteCountArray.map((_, index) => {
                    return (
                        <div key={index} className={`vote-icon ${roomInfo.vote_count && roomInfo.vote_count > index ? "fill" : ""}`}>{voteCountArray[index]}</div>
                    )
                })}
            </Flex>
        </Paper>
    )
}