# SP-ANEST-001 — estado da implementação

**Branch de trabalho:** `fix/security-and-course-consistency`

**Data:** 21 de setembro de 2026

## Escopo concluído no primeiro ciclo

A página inicial deixou de servir como falsa barreira de login e passou a funcionar como portal público de cursos. A rota docente agora exibe somente um aviso de implantação segura. Foram retirados do HTML atual os marcadores de autenticação no cliente, a credencial compartilhada, a lista de acesso, os scripts completos dos cenários, o setup operacional, o banco de questões e os gabaritos.

As páginas do curso e do participante foram harmonizadas para a janela de 8h às 17h, intervalo de 15 minutos, almoço de 60 minutos e 7h45 de atividades efetivas. A avaliação foi caracterizada como formativa, sem nota, aprovação, reprovação, ranking, efeito sobre RQE ou declaração de competência clínica.

A ementa, o objetivo geral, os objetivos específicos e o conteúdo programático foram revistos. A página pública descreve apenas o foco pedagógico dos cenários e informa que os detalhes operacionais são restritos. O calendário e o corpo docente públicos foram preservados sem e-mails pessoais.

Também foram criadas páginas públicas de privacidade, acessibilidade e erro 404, além de `robots.txt`, `sitemap.xml` e um validador automático de links, estrutura, coerência e marcadores proibidos.

## Ação obrigatória fora do código

A credencial anteriormente publicada deve ser considerada comprometida. Ela precisa ser revogada ou rotacionada em qualquer outro serviço onde tenha sido reutilizada. A simples remoção do arquivo atual não apaga versões históricas do Git nem cópias já obtidas por terceiros.

Não inserir uma nova senha em HTML, JavaScript, commit, issue ou arquivo público. O próximo mecanismo de acesso deve validar sessão no servidor e entregar os documentos somente após autorização.

## Limite deste ciclo

Este repositório é um site estático. Ele não oferece autenticação real nem armazenamento privado por si só. Por isso, a área docente permanece sem conteúdo restrito até que seja implementado um backend seguro, por exemplo com Supabase Auth e Storage privado protegidos por Row Level Security.

Os textos dos cenários não foram reescritos integralmente neste ciclo porque os scripts completos devem ser tratados como arquivos privados e passar por revisão clínica antes de voltar a ser disponibilizados aos instrutores.

## Próximo ciclo recomendado

O segundo ciclo deve criar o projeto de autenticação, os papéis `administrador` e `instrutor`, o bucket privado e as políticas de acesso. Depois disso, os documentos docentes serão enviados ao armazenamento privado e a página de equipe docente poderá exibir links temporários apenas para usuários autorizados.

Em paralelo, devem ser revisados CEN-01, CEN-02, os checklists, o prebriefing, o roteiro GAS, as formas A/B e a matriz objetivo–atividade–evidência–critério.

## Validação local

Executar:

```bash
python scripts/validate_site.py
```

O teste deve terminar com `OK` e não pode localizar autenticação client-side, credenciais antigas, arquivos de banco/gabarito ou links internos quebrados.
