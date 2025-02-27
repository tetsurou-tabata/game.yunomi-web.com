import { Container, Title, Paper, TextInput, PasswordInput, Text, Anchor, Button } from "@mantine/core";
import style from "@/scss/login-form.module.scss";

export default function Home() {
    return (
        <div id="page-login">
            <Container size={420} my={80}>
                <Title ta="center" className={style.title}>
                    ようこそ！
                </Title>
                <Text c="dimmed" size="sm" ta="center" mt={5}>
                    アカウント新規作成は{' '}
                    <Anchor size="sm" component="button">
                        こちら
                    </Anchor>
                </Text>

                <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                    <TextInput label="メールアドレス" placeholder="you@mantine.dev" required />
                    <PasswordInput label="パスワード" placeholder="your password" mt="md" required />
                    <Button fullWidth mt="xl">
                        サインイン
                    </Button>
                </Paper>
            </Container>
        </div>
    );
}
