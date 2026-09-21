# SP-ANEST-001 — estado da implementação

**Branch de trabalho:** `feat/supabase-auth-private-storage`

**Data:** 21 de setembro de 2026

## Primeiro ciclo — portal público

O portal público foi saneado: a antiga senha compartilhada, a lista de acesso, os scripts completos dos cenários, o setup operacional, o banco de questões e os gabaritos foram retirados do HTML. A ementa, os objetivos, o conteúdo programático, a agenda e a comunicação sobre as avaliações formativas foram harmonizados.

A credencial anteriormente publicada permanece comprometida por constar no histórico Git. Ela não deve ser reutilizada em nenhum serviço.

## Segundo ciclo — autenticação e armazenamento privado

O projeto Supabase `qouylryampbwdqubfcbx` recebeu duas migrações versionadas. Foram criadas as tabelas `user_roles`, `courses`, `course_memberships` e `course_documents`, todas protegidas por Row Level Security. O curso `SP-ANEST-001` foi cadastrado como ativo.

O bucket `course-materials` é privado, aceita apenas os tipos de arquivo configurados e limita cada objeto a 25 MB. A autorização exige papel ativo, vínculo ativo com curso ativo e, para instrutores, documento publicado. Administradores podem criar metadados, enviar, publicar e excluir arquivos. A remoção ou desativação do último administrador é bloqueada.

A Edge Function `admin-course-access` está ativa com verificação JWT obrigatória. A chave `service_role` permanece somente no ambiente servidor do Supabase. O navegador utiliza apenas a chave publicável, conforme o modelo de segurança da plataforma.

O primeiro administrador foi convidado e recebeu papel ativo por um bootstrap temporário. O modo de bootstrap foi removido imediatamente e a função voltou à versão normal protegida por JWT.

## Validação concluída

- Quatro tabelas públicas com RLS habilitada.
- Bucket privado e políticas separadas para leitura, inserção, atualização e exclusão.
- Auditor de segurança do Supabase sem alertas.
- Auditor de desempenho sem problemas de política; apenas índices novos ainda sem uso, esperado antes do tráfego.
- REST anônimo: HTTP 401.
- Listagem anônima do bucket: vazia.
- Edge Function sem JWT: HTTP 401.
- Página de login revisada em 1440 × 1000 px e 375 × 812 px.
- Validadores locais de site, autenticação e migração aprovados.

## Pendências antes da operação regular

1. Fazer merge do pull request deste ciclo para publicar a nova tela no GitHub Pages.
2. O primeiro administrador deve aceitar o convite somente depois do deploy ou solicitar novo link mágico na página publicada.
3. Testar uma sessão administrativa real: login, upload em rascunho, publicação e abertura por URL assinada.
4. Convidar ao menos um usuário de teste com papel de instrutor e confirmar que ele não consegue administrar, enviar ou ver rascunhos.
5. Carregar os materiais docentes revisados no bucket privado.

## Validação local

```bash
pnpm install
pnpm build
pnpm check
```

O teste deve terminar com aprovação do validador do portal e do validador específico de Auth/RLS.
