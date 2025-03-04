'use client'
import { login } from "@/app/actions";
import { Container, Title, Paper, TextInput, PasswordInput, Text, Anchor, Button } from "@mantine/core";
import style from "@/scss/login-form.module.scss";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { notifications } from '@mantine/notifications';

export default function Home() {

    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    const handleLogin = async () => {
        if (loading) return;
        setLoading(true);
        const email = emailRef.current?.value;
        const password = passwordRef.current?.value;

        try {
            if (!email || !password) {
                throw new Error('入力してください');
            }
            const res = await login(email, password);
            if (res.status == false) {
                throw new Error(res.message);
            }
            router.refresh();
        } catch (error) {
            const message = (error instanceof Error) ? error.message : 'エラーが発生しました';
            notifications.show({
                title: 'ログインエラー',
                color: 'red',
                message: message
            })
            setLoading(false);
        }
    }

    return (
        <div id="page-login">
            <Container size={420} my={80}>
                <Title ta="center" className={style.title}>
                    ようこそ！
                </Title>
                <Text c="dimmed" size="sm" ta="center" mt={5}>
                    アカウント新規作成は{' '}
                    <Anchor href="/signup" size="sm">
                        こちら
                    </Anchor>
                </Text>

                <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                    <TextInput ref={emailRef} label="メールアドレス" placeholder="you@mantine.dev" required />
                    <PasswordInput ref={passwordRef} label="パスワード" placeholder="your password" mt="md" required />
                    <Button fullWidth mt="xl" onClick={handleLogin}>
                        {loading ? 'サインイン中...' : 'サインイン'}
                    </Button>
                </Paper>
            </Container>
        </div>
    );
}
