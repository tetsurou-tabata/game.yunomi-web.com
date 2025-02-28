'use client'
import { Database } from "@/types/supabasetype"
import { Button, Checkbox, Radio, Group } from '@mantine/core';
import { useEffect, useState } from 'react';
import { createClient } from "@/utils/supabase/client";
import { useParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { getRoomMemberAction } from "@/app/utilActions";
import { stepToString } from "@/app/functions";

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
            if (!res.data) throw new Error("ルーム情報の取得に失敗しました")
            const allowVote = res.data.filter((member: Player) => member.vote == "yes").length;
            if (allowVote > 0) {
                const { error } = await supabase.from("t_room").update({
                    step: "mission",
                }).eq('id', roomId)
            } else {
                const memberLength = res.data.length
                const nextReader: number = (player?.order != undefined && player?.order < memberLength) ? (player?.order + 1) % memberLength : 0;
                const { error: memberError } = await supabase.from("t_room_member").update({
                    vote: "init"
                }).eq('room_id', roomId)
                const { error } = await supabase.from("t_room").update({
                    step: "formation",
                    reader: nextReader
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
            const failMission = res.data.filter((member: Player) => member.vote == "no").length;
            console.log(failMission)
            console.log(roomInfo);
            // if (failMission > 0) {
            //     const { error } = await supabase.from("t_room").update({
            //         step: "formation",
            //     }).eq('id', roomId)
            // }
        } catch (error) {
            console.error(error)
        }
    }

    const exitGame = async () => {
        try {
            const { data: member, error: memberError } = await supabase.from("t_room_member").delete().eq('room_id', roomId)
            if (memberError) throw memberError
            const { data: room, error: roomError } = await supabase.from("t_room").delete().eq('id', roomId)
            if (roomError) throw roomError
        } catch (error) {
            console.error(error)
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
        <div>
            <h1>Game Page</h1>
            {roomInfo && roomMember && (
                roomMember.map((member, index) => (
                    <div key={index}>
                        <p>{member.t_user.name} ({member.m_role.name}) {member.member_flag && <span>メンバー</span>}</p>
                        {roomInfo.step == "voting" && (
                            member.vote != 'init' ? <p>投票済み</p> : <p>投票中</p>
                        )}
                    </div>
                ))
            )}

            {roomInfo && (
                <p>現在のフェーズ: {stepToString(roomInfo.step)}</p>
            )}

            {player && (
                <p>あなたのロール: {player.m_role.name}</p>
            )}
            {player && <p>現在のステータス: {player.status}</p>}

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
                        <Button mt={20} disabled={!vote || isVote} onClick={commitVote}>
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
        </div>
    )
}