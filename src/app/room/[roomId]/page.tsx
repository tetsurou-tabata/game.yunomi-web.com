'use client'
import { useDisclosure } from '@mantine/hooks';
import { Database } from "@/types/supabasetype"
import { createClient } from "@/utils/supabase/client";
import { Button, Badge } from "@mantine/core";
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from "react";
import { getRoleArray } from "@/app/functions"
import { Title, Flex, Text, Modal } from "@mantine/core";
import Loading from "@/app/components/loading";
import { notifications } from "@mantine/notifications";

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
    const [modalOpen, { open, close }] = useDisclosure(false);
    const [modalText, setModalText] = useState("")

    const fetchRealtimeData = () => {
        const chanelName = `update-room-member-${roomId}`;
        try {
            const channel = supabase.channel(chanelName)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "t_room_member",
                        filter: `room_id=eq.${roomId}`,
                    },
                    (payload) => {
                        // console.log("member", payload)
                        if (payload.eventType === "INSERT") {
                            getRoomMember()
                        }
                        if (payload.eventType === "UPDATE" && payload.new.status !== "playing") {
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
                        filter: `id=eq.${roomId}`,
                    },
                    (payload) => {
                        // console.log("room", payload)
                        if (payload.eventType === "UPDATE") {
                            if (payload.new.is_start) {
                                setLoading(true)
                                router.push('/game/' + roomId)
                                return;
                            }
                            if (payload.new.status == "closed") {
                                router.push('/')
                                return;
                            }
                            if (payload.new.is_start == false) {
                                getRoomMember();
                            }
                        }
                    }
                )
                .subscribe()

            return () => supabase.removeChannel(channel);
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
            const { data: room, error } = await supabase.from('t_room').select('*').eq('id', roomId).single()
            if (error) throw new Error("無効な部屋です。ロビーに戻ります。")
            setRoomInfo(room)
        } catch (error) {
            const message = (error instanceof Error) ? error.message : 'エラーが発生しました';
            setModalText(message)
            open()
        }
    }

    const getRoomMember = async () => {
        try {
            const { data: members, error } = await supabase
                .from('t_room_member')
                .select('*, t_user(name), t_room(member_limit)')
                .eq('room_id', roomId)
                .order('created_at', { ascending: true })
            if (error) throw new Error("無効な部屋です。ロビーに戻ります。");
            if (members.length == 0) throw new Error("無効な部屋です。ロビーに戻ります。");
            setMembers(members)
            // 自分のステータスを更新
            const { data: user } = await supabase.auth.getUser()
            if (!user) throw new Error();
            const myStatus = members.find(member => member.user_id === user?.user?.id)
            if (myStatus) {
                setStatus(myStatus.status)
            }
            const maxMemberLimit = myStatus.t_room.member_limit
            // 準備完了の人数を数える
            const readyMembers = members.filter(member => member.status === 'ready')
            setStartReady(readyMembers.length === maxMemberLimit)
        } catch (error) {
            const message = (error instanceof Error) ? error.message : 'エラーが発生しました';
            setModalText(message)
            open()
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
            const { data, error } = await supabase.rpc('increment', { x: 1, room_id: roomId })
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
            const { data: room, error: roomError } = await supabase.from("t_room").update({ status: "closed" }).eq('id', roomId)
            if (roomError) throw roomError
        } catch (error) {
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
                status: "playing"
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
            await getRoomInfo();
            await getRoomMember();
            await getMyStatus();
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

            <Modal opened={modalOpen} onClose={close} title="エラー">
                <Text mb="md">{modalText}</Text>
                <Button onClick={() => router.push('/')} w={"100%"}>ロビーに戻る</Button>
            </Modal>

            {loading && <Loading />}
        </div>
    )
}