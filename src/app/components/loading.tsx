import { Loader, Flex, Text } from '@mantine/core';

export default function Loading() {
    return (
        <Flex direction='column' gap="md" justify="center" align="center" id="loading-cover">
            <Text>読み込み中</Text>
            <Loader type="dots" />
        </Flex>
    )
}