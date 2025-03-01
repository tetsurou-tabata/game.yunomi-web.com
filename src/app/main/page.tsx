"use client"
import { Database } from "@/types/supabasetype"
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { Button, Title, Paper, Flex, Text } from "@mantine/core";
import { useRouter } from 'next/navigation'
import { v4 } from "uuid";
import Loading from "@/app/components/loading";

const channelName = "update-room";

export default function Main() {

    const supabase = createClient();
    const router = useRouter();
    const [rooms, setRooms] = useState<Database["public"]["Tables"]["t_room"]["Row"][]>([]);
    const [loading, setLoading] = useState(false);

    const fetchRealtimeData = () => {
        try {
            supabase.channel(channelName)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "t_room",
                    },
                    (payload) => {
                        getRooms();
                    }
                )
                .subscribe()

            return () => supabase.channel(channelName).unsubscribe()
        } catch (error) {
            console.error(error)
        }
    }

    const getRooms = async () => {
        try {
            const { data, error } = await supabase.from("t_room").select("*").order('created_at', { ascending: true })
            if (error) throw error
            setRooms(data)
        } catch (error) {
            console.error(error)
        }
    }

    const enterRoom = async (roomId: string, isOwner: boolean) => {
        try {
            setLoading(true)
            const { data: user } = await supabase.auth.getUser()
            if (!user) throw new Error();
            const insertData = {
                user_id: user?.user?.id,
                room_id: roomId,
                status: isOwner ? "ready" : "wait",
                is_owner: isOwner
            }
            const { data: room, error } = await supabase.from("t_room_member").upsert(insertData)
            if (error) throw error
            router.push('/room/' + roomId);
        } catch (error) {
            console.error(error)
            setLoading(false)
        }
    }

    const createRoom = async () => {
        try {
            setLoading(true);
            const { data: user } = await supabase.auth.getUser()
            if (!user) throw new Error();
            const roomId = v4();
            const { data: room, error } = await supabase.from("t_room").insert([
                {
                    id: roomId,
                    member_limit: 2,
                }
            ])
            if (error) throw error
            enterRoom(roomId, true);
        } catch (error) {
            console.error(error)
            setLoading(false);
        }
    }

    useEffect(() => {
        (async () => {
            await getRooms()
        })()
        fetchRealtimeData()
    }, [])

    return (
        <div id="page-main">
            <Title mb={20} ta="center">ロビー</Title>
            <div className="">
                <Flex
                    gap="md"
                    justify="flex-start"
                    align="flex-start"
                    direction="column"
                    mb={100}
                >
                    {rooms.map((room) => (
                        <Paper key={room.id} w={"100%"} p="md" withBorder>
                            <Text size="sm" fw="bold">{room.id}</Text>
                            {/* <p>{room.member_num}/{room.member_limit}</p> */}
                            <Button onClick={() => enterRoom(room.id, false)} mt="sm" w={"100%"} disabled={room.member_num == room.member_limit}>入室</Button>
                        </Paper>
                    ))}
                </Flex>
            </div>
            <Button onClick={() => createRoom()} w={"100%"}>新しい部屋を作成</Button>
            {loading && <Loading />}
        </div>
    )
}