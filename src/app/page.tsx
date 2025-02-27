'use client'
import { login } from "@/app/actions";
import { Container, Title, Paper, TextInput, PasswordInput, Text, Anchor, Button } from "@mantine/core";
import style from "@/scss/login-form.module.scss";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

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

        if (!email || !password) {
            alert('入力してください');
            setLoading(false);
            return;
        }

        const res = await login(email, password);
        if (res.status) {
            router.refresh();
        }

        setLoading(false);
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
