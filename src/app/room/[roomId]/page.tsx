'use client'
import { Database } from "@/types/supabasetype"
import { createClient } from "@/utils/supabase/client";
import { Button } from "@mantine/core";
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from "react";
import { getRoleArray } from "@/app/functions"
import Loading from "@/app/components/loading";

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
            console.error(error)
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
        <>
            <div>{roomInfo?.id}</div>
            <p>{members.length}/{roomInfo?.member_limit}</p>
            <div>
                {members.map(member => (
                    <div key={member.id}>
                        <p>{member.status}</p>
                        <p>{member.t_user.name}</p>
                    </div>
                ))}
            </div>
            {player && !player.is_owner && (
                <>
                    <Button onClick={() => leaveRoom()}>退出</Button>
                    <Button onClick={() => switchStatus()}>
                        {status === "wait" ? "準備OK" : "準備完了"}
                    </Button>
                </>
            )}
            {player && player.is_owner && (
                <>
                    <Button disabled={!startReady} onClick={startGame}>
                        {startReady ? "ゲーム開始" : "準備中"}
                    </Button>
                    <Button onClick={removeRoom}>部屋を解体する</Button>
                </>
            )}
            {loading && <Loading />}
        </>
    )
}