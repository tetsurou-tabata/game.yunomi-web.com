'use client';
import { Container, Title, Paper, TextInput, PasswordInput, Text, Anchor, Button } from "@mantine/core";
import style from "@/scss/login-form.module.scss";
import { useRef, useState } from "react";
import { signup } from "@/app/signup/actions";

export default function Signup() {

    const [loading, setLoading] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    const handleSignup = async () => {
        if (loading) return;
        setLoading(true);
        const name = nameRef.current?.value;
        const email = emailRef.current?.value;
        const password = passwordRef.current?.value;

        if (!name || !email || !password) {
            alert('入力してください');
            setLoading(false);
            return;
        }

        const res = await signup(name, email, password);
        if (res.status == true) {
            alert('認証メールを送信しました');
        }

        setLoading(false);
    }

    return (
        <div id="page-login">
            <Container size={420} my={80}>
                <Title ta="center" className={style.title}>
                    サインアップ
                </Title>
                <Text c="dimmed" size="sm" ta="center" mt={5}>
                    <Anchor href="/" size="sm">
                        ログインページに戻る
                    </Anchor>
                </Text>

                <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                    <TextInput ref={nameRef} label="ニックネーム" placeholder="" required />
                    <TextInput ref={emailRef} label="メールアドレス" placeholder="example@address" autoComplete="email" mt="md" required />
                    <PasswordInput ref={passwordRef} label="パスワード" placeholder="your password" autoComplete="current-password" mt="md" required />
                    <Button fullWidth mt="xl" onClick={handleSignup}>
                        {loading ? 'サインアップ中...' : 'サインアップ'}
                    </Button>
                </Paper>
            </Container>
        </div>
    );
}
