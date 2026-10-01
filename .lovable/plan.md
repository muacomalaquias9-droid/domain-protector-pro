# GuardaWeb: correção do BI e nova experiência profissional

## Objetivo
Transformar a apresentação pública num produto web/app profissional, fluido em Android, iPhone, tablet e desktop, corrigir o preenchimento do cadastro por BI e reforçar proteções sem expor detalhes sensíveis.

## O que será alterado

### 1. Cadastro por BI
- Corrigir o tratamento da resposta da consulta para reconhecer os campos de data devolvidos pelo serviço, em formatos diferentes.
- Preencher automaticamente data de nascimento e idade quando a fonte oficial fornecer esses dados.
- Quando a fonte devolver apenas o nome, deixar isso claro e manter a data editável, sem inventar dados pessoais.
- Normalizar o BI, validar o formato no navegador e novamente no servidor, limitar tentativas e apresentar mensagens úteis.

### 2. Landing page no estilo das referências
- Adotar uma direção visual escura, azul-elétrica e luminosa, inspirada nas duas imagens enviadas, sem copiar marcas ou textos delas.
- Criar uma primeira área imersiva com a GuardaWeb em destaque, scanner funcional e uma prévia visual do painel em formato de app web.
- Reorganizar benefícios, funcionamento, ferramentas de segurança e chamadas para ação com melhor hierarquia e texto natural.
- Usar a fotografia enviada numa secção institucional: **Isaac Muaco, CEO da GuardaWeb**.
- Apresentar oferta de VPS com opções escaláveis e capacidade de até **128 GB**, sem afirmar recursos técnicos que ainda não estejam ativos no serviço.

### 3. Movimento e responsividade
- Adicionar Framer Motion para entradas suaves, revelação por deslocamento e interações discretas.
- Respeitar a preferência de movimento reduzido do dispositivo.
- Ajustar cabeçalho, scanner, grelhas, cartões e imagem do CEO para 360 px, tablets e ecrãs largos, sem cortes nem sobreposição.

### 4. Segurança
- Manter credenciais privadas apenas no servidor e nunca mostrá-las na interface ou mensagens de erro.
- Reforçar cabeçalhos de segurança, validação de entradas, proteção contra destinos internos no scanner e limites nas consultas públicas.
- Evitar promessas absolutas de segurança; comunicar proteções reais e verificáveis.
- Executar verificação de dependências e segurança após as alterações.

## Detalhes técnicos
- Preservar TanStack Start, Lovable Cloud e os fluxos atuais do painel.
- Guardar as imagens usadas pelo site no armazenamento de assets do projeto; a primeira imagem será tratada como retrato do CEO e as outras duas apenas como referências visuais.
- Centralizar cores, sombras e superfícies em tokens semânticos globais.
- Usar os controlos existentes do sistema visual para ações e formulários.
- Atualizar os metadados da página e validar a experiência no navegador em tamanhos móvel e desktop.

## Critérios de conclusão
- O BI válido preenche todos os campos que a fonte realmente disponibilizar; a ausência da data não é apresentada como sucesso total.
- A página inicial segue a estética app web escura e luminosa das referências e mostra Isaac Muaco como CEO.
- A oferta de VPS até 128 GB está visível e claramente apresentada.
- Não há overflow ou texto sobreposto nos principais tamanhos de ecrã.
- A aplicação compila sem erros e as verificações de segurança não deixam falhas críticas introduzidas pela mudança.
