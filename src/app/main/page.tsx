"use client"
import { useDisclosure } from '@mantine/hooks';
import { Database } from "@/types/supabasetype"
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect, useRef } from "react";
import { Button, Title, Paper, Flex, Text, Modal, TextInput, NativeSelect } from "@mantine/core";
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation'
import { v4 } from "uuid";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CachedIcon from '@mui/icons-material/Cached';
import Loading from "@/app/components/loading";

type Room = Database["public"]["Tables"]["t_room"]["Row"];
type RoomMember = Database["public"]["Tables"]["t_room_member"]["Row"];

export default function Main() {

    const supabase = createClient();
    const router = useRouter();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [modalOpen, { open, close }] = useDisclosure(false);
    const [enteredModal, { open: openEnterdModal, close: closeEnterdModal }] = useDisclosure(false);
    const [enteredRoom, setEnteredRoom] = useState<RoomMember>();
    const [loading, setLoading] = useState(false);
    const roomNameRef = useRef<HTMLInputElement>(null);
    const maxMemberRef = useRef<HTMLSelectElement>(null);

    const getRooms = async () => {
        try {
            const { data, error } = await supabase.from("t_room").select("*").eq("status", "wait").order('created_at', { ascending: true })
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
            if (!user) throw new Error("ユーザー情報の取得に失敗しました");
            // 部屋が存在するか確認する
            const { data: roomInfo, error: roomInfoError } = await supabase.from("t_room").select("*").eq('id', roomId).eq("status", "wait").single()
            if (roomInfoError) throw new Error("無効になった部屋です");
            if (!roomInfo) throw new Error("部屋が存在しません");
            // ユーザーが部屋に入る
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
            const message = (error instanceof Error) ? error.message : 'エラーが発生しました';
            notifications.show({
                title: "エラー",
                color: "red",
                message: message
            })
            setLoading(false)
        }
    }

    const enterRoomForEntered = async () => {
        setLoading(true)
        router.push('/room/' + enteredRoom?.room_id);
    }

    const createRoom = async () => {
        try {
            setLoading(true);

            const roomName = roomNameRef.current?.value;
            const maxMember = maxMemberRef.current?.value;
            if (!roomName) throw new Error("部屋名を入力してください");

            const { data: user } = await supabase.auth.getUser()
            if (!user) throw new Error();
            const roomId = v4();
            const { data: room, error } = await supabase.from("t_room").insert([
                {
                    id: roomId,
                    member_limit: Number(maxMember),
                    name: roomName
                }
            ])
            if (error) throw error
            enterRoom(roomId, true);
        } catch (error) {
            const message = (error instanceof Error) ? error.message : 'エラーが発生しました';
            console.log(message);
            notifications.show({
                title: "エラー",
                color: "red",
                message: message
            })
            setLoading(false);
        }
    }

    const checkEnterable = async () => {
        try {
            setLoading(true)

            const { data: user } = await supabase.auth.getUser()
            if (!user) throw new Error();
            const { data: room, error } = await supabase.from("t_room_member")
                .select("*, t_room(status)")
                .eq("user_id", user?.user?.id)
                .eq("t_room.status", "wait")
                .single()
            if (room) {
                setEnteredRoom(room);
                openEnterdModal();
            }
        } catch (error) {
            const message = (error instanceof Error) ? error.message : 'エラーが発生しました';
            notifications.show({
                title: "エラー",
                color: "red",
                message: message
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        (async () => {
            await checkEnterable();
            await getRooms()
        })()
    }, [])

    return (
        <div id="page-main">
            <Title mb={20} ta="center">ロビー</Title>
            {rooms.length > 0 ? (
                <Flex
                    gap="md"
                    justify="flex-start"
                    align="flex-start"
                    direction="column"
                    mb={50}
                >
                    {rooms.map((room) => (
                        <Paper key={room.id} w={"100%"} p="md" withBorder>
                            <Text size="xl" fw="bold">{room.name}</Text>
                            <Text size="sm" fw="bold">定員：{room.member_limit}</Text>
                            <Button onClick={() => enterRoom(room.id, false)} mt="sm" w={"100%"} disabled={room.status != "wait"}>入室</Button>
                        </Paper>
                    ))}
                </Flex>
            ) : (
                <Flex direction="column" gap="md" justify="center" align="center" mb={50}>
                    <Text c="dimmed" ta="center">部屋がありません</Text>
                </Flex>
            )}
            <Flex direction="column" gap="md" justify="center" align="center">
                <Button onClick={getRooms} w={"100%"} leftSection={<CachedIcon style={{ fontSize: '1rem' }} />}>更新</Button>
                <Button onClick={open} w={"100%"} leftSection={<AddCircleIcon style={{ fontSize: '1rem' }} />}>新しい部屋を作成</Button>
            </Flex>
            <Modal opened={modalOpen} onClose={close} title="新しい部屋を作成">
                <TextInput label="部屋名" placeholder="部屋名" ref={roomNameRef} mb={"md"} />
                <NativeSelect
                    label="人数"
                    data={['2', '3', '4', '5', '6', '7', '8', '9', '10']}
                    ref={maxMemberRef}
                    mb={"md"}
                />
                <Button onClick={() => createRoom()} w={"100%"}>作成</Button>
            </Modal>

            <Modal opened={enteredModal} onClose={closeEnterdModal} title="参加中の部屋があります。">
                <Button onClick={() => enterRoomForEntered()} w={"100%"}>入室</Button>
            </Modal>

            {loading && <Loading />}
        </div>
    )
}