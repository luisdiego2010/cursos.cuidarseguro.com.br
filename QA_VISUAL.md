# Registro de verificação visual local

## 21 de setembro de 2026 — desktop

### Página inicial

- Hierarquia visual clara, com título, três ações principais, curso disponível e aviso de segurança.
- Contraste e espaçamento adequados na visualização desktop.
- Não há overflow horizontal no viewport observado.
- A área docente aparece como indisponível temporariamente, sem campo de senha nem conteúdo restrito.

### Página do curso

- Título, público, horário e carga efetiva aparecem com boa prioridade visual.
- Ementa, objetivos e conteúdo programático estão legíveis e coerentes com a auditoria.
- Navegação para participante, equipe docente e privacidade está visível.
- Cenários são descritos apenas pelo foco pedagógico; scripts, setup, banco e gabaritos não aparecem.
- A página é longa, mas mantém boa hierarquia; uma futura iteração poderá adicionar sumário com âncoras.

### Página do participante

- Horários, pausas e tempo efetivo estão coerentes com o briefing aprovado.
- A separação entre avaliação formativa, simulação e feedback de reação está clara.
- Aviso de desidentificação de relatos e informação de transmissão sem gravação estão visíveis.
- A grade é legível no viewport desktop e usa cores distintas para atividade, intervalo e simulação.

### Página da equipe docente

- A página não contém formulário de login client-side, lista de e-mails, senha, cenários, banco, gabaritos ou setup.
- O aviso de implantação segura explica a restrição sem revelar material operacional.
- A página apresenta somente ações técnicas necessárias e navegação de retorno.

### Teste de largura estreita

O navegador de inspeção manteve viewport de 1280 × 1100 e ignorou `window.resizeTo`, portanto não foi possível certificar um viewport móvel por essa rota. A proteção responsiva permanece implementada em CSS para larguras até 680 px, e o validador confirma links e estrutura. Antes da publicação definitiva, recomenda-se conferir 375 px em dispositivo ou emulação de desenvolvimento.

### Verificação móvel real — 375 × 812 px

As páginas do curso e do participante foram renderizadas com Chromium headless em 375 × 812 px. Não houve corte horizontal, sobreposição ou texto ilegível. O título quebra de forma adequada, metadados ficam empilhados e os botões de navegação mantêm área de toque e contraste. A página do participante apresenta horário, pausa, almoço e ausência de nota antes da dobra, seguida das orientações essenciais.
