
export const errorCodeToMessage = (error: any) => {

    if (error.code === undefined) {
        if (error.message.includes('Auth session missing')) {
            return '認証期限が切れました。変更メールを送信してください。'
        }
        return '不明なエラーです。'
    }

    switch (error.code) {
        case 'email_not_confirmed':
            return 'メールアドレスの認証が完了していません。'
        case 'invalid_credentials':
            return 'メールアドレスまたはパスワードが違います'
        case 'anonymous_provider_disabled':
            return 'メールアドレスを入力してください。'
        case 'validation_failed':
            // passwordが含まれていたら
            if (error.message.includes('password')) {
                return 'パスワードの形式が正しくありません。'
            }
            return '入力内容に誤りがあります。'
        case 'over_email_send_rate_limit':
            return 'リクエストが制限されています。しばらくしてから再度お試しください。'
        case 'weak_password':
            return 'パスワードは6文字以上で設定してください。'
        default:
            return '不明なエラーです。'
    }
}