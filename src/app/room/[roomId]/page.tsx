'use client'
import { Database } from "@/types/supabasetype"
import { createClient } from "@/utils/supabase/client";
import { Button, Badge } from "@mantine/core";
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from "react";
import { getRoleArray } from "@/app/functions"
import { Title, Flex, Text } from "@mantine/core";
import Loading from "@/app/components/loading";
import { notifications } from "@mantine/notifications";

const memberChannelName = "update-room-member";

type Member = Database["public"]["Tables"]["t_room_member"]["Row"] & { t_user: Database["public"]["Tables"]["t_user"]["Row"] }

export default function Room() {

    const supabase = createClient();
    const router = useRouter();
    const params = useParams<{ roomId: string }>()
    const roomId = params.roomId
    const [roomInfo, setRoomInfo] = useState<Database["public"]["Tables"]["t_room"]["Row"]>()
    const [members, setMembers] = useState<Member[]>([])
    const [startReady, setStartReady] = useState(false)
    const [status, setStatus] = useState<"wait" | "ready" | "playing">("wait");
    const [player, setPlayer] = useState<Database["public"]["Tables"]["t_room_member"]["Row"]>()
    const [loading, setLoading] = useState(false)

    const fetchRealtimeData = () => {
        try {
            supabase.channel(memberChannelName)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "t_room_member",
                    },
                    (payload) => {
                        if (payload.eventType === "INSERT" || payload.eventType === "DELETE") {
                            getRoomMember()
                        }
                        if (payload.eventType === "UPDATE" && payload.new.status !== "playing") {
                            console.log(payload);
                            getRoomMember()
                        }
                    }
                )
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
                            if (payload.new.is_start) {
                                setLoading(true)
                                router.push('/game/' + roomId)
                            }
                        }
                    }
                )
                .subscribe()

            return () => supabase.channel(memberChannelName).unsubscribe()
        } catch (error) {
            console.error(error)
        }
    }

    const getMyStatus = async () => {
        try {
            const { data: user } = await supabase.auth.getUser()
            if (!user) throw new Error();
            const { data, error } = await supabase.from("t_room_member").select("*").eq('user_id', user?.user?.id).eq('room_id', roomId).single()
            if (error) throw error
            setPlayer(data)
        } catch (error) {
            console.error(error)
        }
    }

    const getRoomInfo = async () => {
        try {
            const { data: room, error } = await supabase
                .from('t_room')
                .select('*')
                .eq('id', roomId)
                .single()
            if (error) throw error
            setRoomInfo(room)
        } catch (error) {
            console.error(error)
        }
    }

    const getRoomMember = async () => {
        try {
            const { data: members, error } = await supabase
                .from('t_room_member')
                .select('*, t_user(name), t_room(member_limit)')
                .eq('room_id', roomId)
                .order('created_at', { ascending: true })
            if (error) throw error
            setMembers(members)
            // 自分のステータスを更新
            const { data: user } = await supabase.auth.getUser()
            if (!user) throw new Error();
            const myStatus = members.find(member => member.user_id === user?.user?.id)
            if (myStatus) {
                setStatus(myStatus.status)
            }
            const maxMemberLimit = myStatus?.t_room.member_limit
            // 準備完了の人数を数える
            const readyMembers = members.filter(member => member.status === 'ready')
            setStartReady(readyMembers.length === maxMemberLimit)
        } catch (error) {
            console.error(error)
        }
    }

    const leaveRoom = async () => {
        try {
            const { data: user } = await supabase.auth.getUser()
            if (!user) {
                throw new Error()
            }
            const { error: selectError } = await supabase.from('t_room_member').delete().eq('user_id', user?.user?.id)
            if (selectError) throw selectError
            // const { data, error } = await supabase.rpc('increment', { x: -1, room_id: room_id })
            router.push('/');
        } catch (error) {
            console.error(error)
        }
    }

    const switchStatus = async () => {
        const { data: user } = await supabase.auth.getUser()
        if (!user) throw new Error();
        const nextStatus = status === "wait" ? "ready" : "wait"
        const { data: member, error } = await supabase.from("t_room_member").update({
            status: nextStatus
        }).eq('user_id', user?.user?.id).eq('room_id', roomId)
    }

    const removeRoom = async () => {
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

    const startGame = async () => {
        try {
            if (!startReady) throw new Error("準備が完了していません");
            if (!roomInfo?.member_limit) throw new Error();
            const member_limit: number = Number(roomInfo?.member_limit);
            // 人数分の数字の配列をランダムで作成
            const orderArray = [...Array(member_limit).keys()].sort(() => Math.random() - 0.5);
            const roleArray = getRoleArray(member_limit);
            const settingRes = await Promise.all(members.map(async (member) => {
                const updateData = {
                    role_id: roleArray.shift(),
                    order: orderArray.shift(),
                    status: "playing"
                }
                const { error } = await supabase.from("t_room_member").update(updateData).eq('user_id', member.user_id).eq('room_id', roomId)
            }))
            const { error } = await supabase.from("t_room").update({
                is_start: true,
                step: "formation",
            }).eq('id', roomId)
            if (error) throw error
        } catch (error) {
            const message = (error instanceof Error) ? error.message : 'エラーが発生しました';
            notifications.clean();
            notifications.show({
                title: "エラー",
                color: "red",
                message: message
            })
        }
    }

    useEffect(() => {
        (async () => {
            await getMyStatus();
            await getRoomInfo();
            await getRoomMember();
        })()
        fetchRealtimeData();
    }, [])

    return (
        <div id="page-main">
            <Title mb="md" ta="center">{roomInfo?.name}</Title>

            <Text size="lg" fw={700} mb="sm">参加者 ({members.length}/{roomInfo?.member_limit})</Text>
            <Flex direction={'column'} gap={5} mb="xl">
                {members.map(member => (
                    <Flex align={'center'} gap={5} key={member.id}>
                        {member.is_owner ? (
                            <Badge color="blue">オーナー</Badge>
                        ) : (
                            <Badge color="gray">メンバー</Badge>
                        )}
                        <Text fw={500}>{member.t_user.name}</Text>
                        {member.status == "wait" ? (
                            <Badge color="gray">準備中</Badge>
                        ) : (
                            <Badge color="green">準備OK</Badge>
                        )}
                    </Flex>
                ))}
            </Flex>

            {player && (
                player.is_owner ? (
                    <Flex direction={'column'} gap="md">
                        <Button onClick={startGame} color={startReady ? "blue" : "gray"}>
                            {startReady ? "ゲーム開始" : "メンバーが準備中"}
                        </Button>
                        <Button onClick={removeRoom} color="red">部屋を解体する</Button>
                    </Flex>
                ) : (
                    <Flex direction={'column'} gap="md">
                        <Button onClick={() => switchStatus()} color={status === "wait" ? "blue" : "green"}>
                            {status === "wait" ? "準備OK" : "準備完了"}
                        </Button>
                        <Button color="red" onClick={() => leaveRoom()}>退出</Button>
                    </Flex>
                )
            )}
            {loading && <Loading />}
        </div>
    )
}