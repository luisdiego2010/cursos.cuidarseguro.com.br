# Operação da área docente com Supabase

## Arquitetura

O portal permanece estático no GitHub Pages. O navegador usa Supabase Auth e uma chave publicável. A autorização efetiva é aplicada no PostgreSQL e no Storage por políticas RLS. Operações que exigem privilégios administrativos de Auth passam pela Edge Function `admin-course-access`, que valida o JWT do solicitante e confirma seu papel de administrador.

A chave `service_role` nunca deve ser copiada para HTML, JavaScript do portal, repositório, issue ou documentação pública.

## Primeiro acesso

O primeiro administrador recebe um convite do Supabase. Depois da publicação da nova página, deve abrir o convite. Se o link tiver expirado ou tiver sido aberto antes do deploy, basta acessar:

<https://cursos.cuidarseguro.com.br/sp-anest-001/instrutores/>

Na página, informe o e-mail autorizado e solicite um novo link mágico. A criação automática de contas está desabilitada; somente usuários previamente convidados recebem sessão.

## URLs de autenticação

No painel Supabase, em **Authentication → URL Configuration**, manter:

| Campo | Valor |
|---|---|
| Site URL | `https://cursos.cuidarseguro.com.br` |
| Redirect URL | `https://cursos.cuidarseguro.com.br/sp-anest-001/instrutores/` |

Para desenvolvimento local, podem ser adicionadas temporariamente `http://127.0.0.1:4173/sp-anest-001/instrutores/` e `http://localhost:4173/sp-anest-001/instrutores/`. Não usar curingas amplos em produção.

## Papéis

| Papel | Permissões |
|---|---|
| Administrador | Convidar usuários, atribuir papéis, enviar documentos, ver rascunhos, publicar, retirar publicação e excluir |
| Instrutor | Ver apenas cursos ativos aos quais esteja vinculado e documentos publicados desses cursos |

O sistema bloqueia a remoção, desativação ou conversão do último administrador ativo.

## Fluxo de documentos

1. O administrador cria os metadados do documento em estado de rascunho.
2. O upload é autorizado apenas se o caminho no bucket corresponder exatamente aos metadados.
3. Se o upload falhar, os metadados temporários são removidos.
4. A publicação ocorre somente após upload concluído.
5. Instrutores abrem o arquivo por URL assinada de curta duração.

O caminho de cada objeto começa pelo UUID do curso. Não mover ou renomear objetos diretamente pelo painel sem atualizar os metadados de forma controlada.

## Convites

Use o formulário **Convidar integrante** da área administrativa. Para instrutores, a função cria também o vínculo com `SP-ANEST-001`. Para administradores, atribui apenas o papel global.

A resposta do formulário não expõe a chave privilegiada. Toda chamada exige sessão válida e papel ativo de administrador.

## Revogação de acesso

Para revogar um instrutor, desative seu vínculo com o curso ou seu papel. Para revogação imediata de sessão em incidente, use também os controles de sessão do Supabase Auth. Nunca substitua a revogação por remoção do link na interface: a política RLS é a barreira obrigatória.

## Monitoramento e auditoria

Após cada alteração de schema ou política, execute os auditores de segurança e desempenho do Supabase. Índices recém-criados podem aparecer como não utilizados até haver tráfego real; reavalie depois de uso representativo antes de removê-los.

Registre a versão do documento usado em cada turma. Materiais clínicos e avaliações devem passar por revisão antes da publicação.

## Recuperação

Se todos os administradores perderem acesso, o procedimento de recuperação deve ser executado apenas por conexão privilegiada controlada, identificando um usuário já existente e atribuindo-lhe `administrator`. Não criar senha compartilhada e não habilitar autoinscrição pública como atalho.
