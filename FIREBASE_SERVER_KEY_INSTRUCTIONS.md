# Como Obter a Firebase Server Key

## Passos:

1. Acesse o Firebase Console: https://console.firebase.google.com
2. Selecione seu projeto: **cea-gutters-app-b8a3d**
3. Clique na **engrenagem ⚙️** → **Configurações do projeto**
4. Vá na aba **"Cloud Messaging"**
5. Na seção **"Cloud Messaging API (Legacy)"**:
   - Se estiver desabilitado, clique em "Gerenciar API no Google Cloud Console"
   - Habilite a "Cloud Messaging API"
   - Volte para o Firebase Console
6. Copie a **"Chave do servidor"** (Server Key)
   - Formato: `AAAAxxxxxxx:APA91bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Depois de copiar:

Execute no terminal dentro da pasta do projeto:

```bash
# No Supabase, definir a chave como secret
supabase secrets set FIREBASE_SERVER_KEY=SUA_CHAVE_AQUI
```

Ou me passe a chave e eu atualizo a Edge Function.

