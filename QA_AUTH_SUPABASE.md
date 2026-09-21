# Verificação da área docente com Supabase

## Estado em 21 de setembro de 2026

A tela de acesso por link mágico foi renderizada localmente em desktop (1440 × 1000 px) e celular (375 × 812 px). Em ambos os formatos, a hierarquia, os botões de navegação, o campo de e-mail e a orientação de privacidade ficaram legíveis. No celular, os controles foram reorganizados verticalmente sem rolagem horizontal.

## Verificações de segurança concluídas

- O projeto Supabase está ativo e saudável.
- As tabelas `user_roles`, `courses`, `course_memberships` e `course_documents` usam RLS.
- O bucket `course-materials` é privado.
- O curso `SP-ANEST-001` está ativo.
- A Edge Function `admin-course-access` está ativa e exige JWT.
- O auditor de segurança do Supabase não apresenta alertas após a segunda migração.
- Requisição anônima ao REST recebeu HTTP 401.
- Listagem anônima do bucket retornou lista vazia.
- Requisição anônima à Edge Function recebeu HTTP 401.
- O único aviso de desempenho restante informa que os índices recém-criados ainda não foram usados, situação esperada antes do primeiro tráfego autenticado.

## Pendente antes da publicação

1. Criar ou convidar o primeiro usuário administrador.
2. Atribuir o papel `administrator` a esse usuário por procedimento de bootstrap privilegiado.
3. Configurar as URLs autorizadas de redirecionamento do Supabase Auth, se ainda não estiverem definidas.
4. Testar o ciclo completo: convite, link mágico, acesso administrativo, upload em rascunho, publicação, acesso do instrutor e revogação.
5. Versionar e abrir pull request; publicar somente após os testes autenticados.
