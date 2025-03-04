'use client'
import { Database } from "@/types/supabasetype"
import { Button, Checkbox, Radio, Group, Flex, Text, Paper, Badge } from '@mantine/core';
import { useEffect, useState } from 'react';
import { createClient } from "@/utils/supabase/client";
import { useParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { getRoomMemberAction } from "@/app/utilActions";
import Loading from "@/app/components/loading";
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import HelpIcon from '@mui/icons-material/Help';
import FaceIcon from '@mui/icons-material/Face';
import Face2Icon from '@mui/icons-material/Face2';
import Face3Icon from '@mui/icons-material/Face3';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PointBoard from "@/app/components/PointBoard";

const roomChannelName = "update-room";

type Player = Database["public"]["Tables"]["t_room_member"]["Row"] & {
    m_role: Database["public"]["Tables"]["m_role"]["Row"]
} & {
    t_user: Database["public"]["Tables"]["t_user"]["Row"]
}

export default function GamePage() {

    const router = useRouter();
    const supabase = createClient();
    const params = useParams<{ roomId: string }>()
    const roomId = params.roomId
    const [roomInfo, setRoomInfo] = useState<Database["public"]["Tables"]["t_room"]["Row"]>()
    const [player, setPlayer] = useState<Player>()
    const [roomMember, setRoomMember] = useState<Player[]>([])
    const [team, setTeam] = useState<string[]>([])
    const [isVote, setIsVote] = useState<boolean>(false)
    const [vote, setVote] = useState<string>("")
    const [voteNum, setVoteNum] = useState<number>(0)
    const [mission, setMission] = useState<string>("")
    const [isMission, setIsMission] = useState<boolean>(false)
    const [missionNum, setMissionNum] = useState<number>(0)
    const [teamLength, setTeamLength] = useState<number>(0)
    const [loading, setLoading] = useState(false)

    const fetchRealtimeRoomData = () => {
        try {
            supabase.channel(roomChannelName)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "t_room",
                    },
                    (payload) => {
                        if (payload.eventType === "DELETE") {
                            router.push('/')
                        }
                        if (payload.eventType === "UPDATE") {
                            console.log(payload.new);
                            getRoomInfo();
                        }
                    }
                )
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "t_room_member",
                    },
                    (payload) => {
                        if (payload.eventType === "UPDATE") {
                            console.log(payload.new);
                            getRoomMember();
                        }
                    }
                )
                .subscribe()

            return () => supabase.channel(roomChannelName).unsubscribe()
        } catch (error) {
            console.error(error)
        }
    }

    const getRoomInfo = async () => {
        try {
            const { data, error } = await supabase
                .from('t_room')
                .select('*')
                .eq('id', roomId)
                .single()
            if (error) throw error
            setRoomInfo(data)
            setVote("init")
            setVoteNum(0)
            setIsVote(false)
            setMission("init")
            setIsMission(false)
            setMissionNum(0)

        } catch (error) {
            console.error(error)
        }
    }

    const getRoomMember = async () => {
        try {
            const res = await getRoomMemberAction(roomId)
            if (!res.data) throw new Error("ルーム情報の取得に失敗しました")
            setRoomMember(res.data)
            // メンバーの数を数える
            const teamNum = res.data.filter((member: Player) => member.member_flag == true).length
            setTeamLength(teamNum)
            // 投票数を数える
            const num = res.data.filter((member: Player) => member.vote != "init").length
            setVoteNum(num)
            // 任務数を数える
            const missionNum = res.data.filter((member: Player) => member.mission != "init").length
            console.log(missionNum)
            setMissionNum(missionNum)

            // プレイヤー情報を更新
            const { data: user } = await supabase.auth.getUser()
            if (!user) throw new Error();
            setPlayer(res.data.find((member: Player) => member.user_id === user?.user?.id))
        } catch (error) {
            console.error(error)
        }
    }

    const commitTeam = async () => {
        try {
            const { error: voteInitError } = await supabase.from("t_room_member").update({
                member_flag: false,
                vote: "init",
                mission: "init",
            }).eq('room_id', roomId)
            const commitRes = await Promise.all(team.map(async (userId: string) => {
                const updateData = {
                    member_flag: true,
                }
                const { error } = await supabase.from("t_room_member").update(updateData).eq('user_id', userId).eq('room_id', roomId)
            }))
            const { error } = await supabase.from("t_room").update({
                step: "voting",
            }).eq('id', roomId)
        } catch (error) {
            console.error(error)
        }
    }

    const commitVote = async () => {
        try {
            const updateData = {
                vote: vote
            }
            const userId = player?.user_id
            if (!userId) throw new Error()
            const { error } = await supabase.from("t_room_member").update(updateData).eq('user_id', userId).eq('room_id', roomId)
            if (error) throw error
            setIsVote(true)
        } catch (error) {
            console.error(error)
        }
    }

    const openVote = async () => {
        try {
            const res = await getRoomMemberAction(roomId)
            if (!res.data) throw new Error("ルーム情報の取得に失敗しました");
            const memberLength = res.data.length;
            const allowVote = res.data.filter((member: Player) => member.vote == "yes").length;
            if (allowVote > memberLength / 2) {
                const { error } = await supabase.from("t_room").update({
                    step: "mission",
                }).eq('id', roomId)
            } else {
                const nextReader: number = (player?.order != undefined && player?.order < memberLength) ? (player?.order + 1) % memberLength : 0;
                // const { error: memberError } = await supabase.from("t_room_member").update({
                //     vote: "init"
                // }).eq('room_id', roomId)
                // if (memberError) throw memberError

                // 現在の投票数を加算
                const currentVoteCount = roomInfo?.vote_count ?? 0
                const { error } = await supabase.from("t_room").update({
                    step: "formation",
                    reader: nextReader,
                    vote_count: currentVoteCount + 1
                }).eq('id', roomId)
            }
        } catch (error) {
            console.error(error)
        }
    }

    const commitMission = async () => {
        try {
            const updateData = {
                mission: mission
            }
            const userId = player?.user_id
            if (!userId) throw new Error()
            const { error } = await supabase.from("t_room_member").update(updateData).eq('user_id', userId).eq('room_id', roomId)
            if (error) throw error
            setIsMission(true)
        } catch (error) {
            console.error(error)
        }
    }

    const openMission = async () => {
        try {
            const res = await getRoomMemberAction(roomId)
            if (!res.data) throw new Error("ルーム情報の取得に失敗しました")
            // ひとつでもnoがある場合は失敗
            console.log(res.data);
            const failMission = res.data.filter((member: Player) => member.mission == "no").length;
            console.log("failMission", failMission)
            if (!roomInfo || !roomInfo.turn) throw new Error()
            const turnIndex = `turn0${roomInfo.turn}`;
            const nextTurn = (roomInfo?.turn) ? roomInfo.turn + 1 : 1;
            const nextReader = (roomInfo?.reader != undefined) ? roomInfo.reader + 1 : 0;
            const updateData = {
                step: "formation",
                turn: nextTurn,
                reader: nextReader,
                [turnIndex]: failMission
            }
            console.log(updateData);
            const { error } = await supabase.from("t_room").update(updateData).eq('id', roomId)
        } catch (error) {
            console.error(error)
        }
    }

    const exitGame = async () => {
        try {
            setLoading(true)
            const { data: member, error: memberError } = await supabase.from("t_room_member").delete().eq('room_id', roomId)
            if (memberError) throw memberError
            const { data: room, error: roomError } = await supabase.from("t_room").delete().eq('id', roomId)
            if (roomError) throw roomError
        } catch (error) {
            console.error(error)
            setLoading(false)
        }
    }

    useEffect(() => {
        (async () => {
            await getRoomInfo()
            await getRoomMember()
            // await getMyStatus()
        })()
        fetchRealtimeRoomData();
    }, [])

    return (
        <div id="page-main">
            {roomInfo && roomMember && player && (
                <PointBoard roomInfo={roomInfo} />
            )}

            <Flex direction={'column'} gap={5}>
                {roomInfo && roomMember && player && (
                    roomMember.map((member, index) => (
                        <Flex align={'center'} gap={5} key={index}>
                            <Flex align={'center'} className="icon">
                                {roomInfo.reader == member.order && <StarRoundedIcon style={{ color: '#efdc37' }} />}
                            </Flex>
                            <Flex align={'center'} className="icon">
                                {player.role_id == 1 && member.user_id == player.user_id && (
                                    <FaceIcon style={{ color: '#228be6' }} />
                                )}
                                {player.role_id == 1 && member.user_id != player.user_id && (
                                    <HelpIcon style={{ color: '#c0c0c0' }} />
                                )}
                                {player.role_id != 1 && member.role_id == 1 && (
                                    <FaceIcon style={{ color: '#228be6' }} />
                                )}
                                {player.role_id != 1 && member.role_id == 2 && (
                                    <FaceIcon style={{ color: '#e62229' }} />
                                )}
                                {player.role_id != 1 && member.role_id == 3 && (
                                    <Face2Icon style={{ color: '#228be6' }} />
                                )}
                                {player.role_id != 1 && member.role_id == 4 && (
                                    <Face3Icon style={{ color: '#e62229' }} />
                                )}
                            </Flex>
                            <Text fw={500}>{member.t_user.name}</Text>
                            {(roomInfo.step == "voting" || roomInfo.step == "mission") && (
                                <Flex align={'center'} className="icon">
                                    {player.member_flag && roomInfo.step == "voting" && (
                                        <ShieldOutlinedIcon style={{ color: '#424242' }} />
                                    )}
                                    {player.member_flag && roomInfo.step == "mission" && (
                                        <VerifiedUserIcon style={{ color: '#66e05d' }} />
                                    )}
                                </Flex>
                            )}
                            {roomInfo.step != "voting" && member.vote != 'init' && (
                                member.vote == 'yes' ? <Badge color="blue">承認</Badge> : <Badge color="gray">却下</Badge>
                            )}
                            {roomInfo.step == "voting" && (
                                member.vote != 'init' ? <Badge color="green">投票済</Badge> : <Badge color="blue">投票中</Badge>
                            )}
                            {roomInfo.step == "mission" && (
                                member.mission != 'init' ? <Badge color="green">任務完了</Badge> : <Badge color="blue">任務中</Badge>
                            )}
                        </Flex>
                    ))
                )}
            </Flex>

            {roomMember && roomInfo && player && (
                roomInfo.step == "formation" && roomInfo.reader == player.order && (
                    <>
                        <Checkbox.Group
                            label="あなたはリーダーです。任務に向かうメンバーを選択してください。"
                            value={team}
                            onChange={setTeam}
                        >
                            <Group mt="xs">
                                {roomMember.map((member, index) => (
                                    member?.user_id && (
                                        <Checkbox key={index} value={member.user_id} label={member.t_user.name} />
                                    )
                                ))}
                            </Group>
                        </Checkbox.Group>
                        <Button mt={20} disabled={team.length != 2} onClick={commitTeam}>決定する</Button>
                    </>
                )
            )}

            {roomMember && roomInfo && player && (
                roomInfo.step == "voting" && (
                    <>
                        <Radio.Group
                            label="メンバーが選出されました。投票を行ってください。"
                            value={vote}
                            onChange={setVote}
                        >
                            <Group mt="xs">
                                <Radio value="yes" label="承認" disabled={isVote} />
                                <Radio value="no" label="却下" disabled={isVote} />
                            </Group>
                        </Radio.Group>
                        <Button mt={20} disabled={vote == "init" || isVote} onClick={commitVote}>
                            {isVote ? "投票済み" : "投票する"}
                        </Button>
                    </>
                )
            )}

            {roomMember && roomInfo && player && (
                roomInfo.step == "voting" && roomInfo.reader == player.order && (
                    <>
                        <Button mt={20} disabled={voteNum != roomMember.length} onClick={openVote}>開票する</Button>
                    </>
                )
            )}

            {roomMember && roomInfo && player && (
                roomInfo.step == "mission" && player.member_flag && (
                    <>
                        <Radio.Group
                            label="あなたがメンバーに選ばれました。あなたはどうしますか?"
                            value={mission}
                            onChange={setMission}
                        >
                            <Group mt="xs">
                                <Radio value="yes" label="成功させる" disabled={isMission} />
                                <Radio value="no" label="失敗させる" disabled={isMission} />
                            </Group>
                        </Radio.Group>
                        <Button mt={20} disabled={!mission || isMission} onClick={commitMission}>
                            {isMission ? "決定済み" : "決定する"}
                        </Button>
                    </>
                )
            )}

            {roomMember && roomInfo && player && (
                roomInfo.step == "mission" && !player.member_flag && (
                    <p>任務を遂行中です</p>
                )
            )}

            {roomMember && roomInfo && player && (
                roomInfo.step == "mission" && roomInfo.reader == player.order && (
                    <Button mt={20} disabled={missionNum != teamLength} onClick={openMission}>結果を見る</Button>
                )
            )}

            {player?.is_owner && (
                <Button onClick={() => exitGame()}>ゲームを終了</Button>
            )}

            {loading && <Loading />}
        </div>
    )
}