# GuardaWeb: acesso por dispositivo e visual liquid glass

## Resultado
A GuardaWeb passa a ter aparência de aplicação móvel premium em preto e branco, com botões liquid glass, ícones Lucide e as três novas imagens na página inicial. O login/cadastro tradicional deixa de aparecer: o acesso será por um ID de dispositivo e uma senha escolhida pelo utilizador.

## Acesso sem cadastro tradicional
- Substituir a página de entrar/registar por uma única tela **Aceder neste dispositivo**.
- No primeiro acesso, gerar um ID de dispositivo aleatório e seguro; o utilizador escolhe apenas uma senha.
- Guardar o ID no armazenamento local do navegador e mostrar uma opção para copiá-lo como chave de recuperação.
- Nos acessos seguintes, preencher o ID automaticamente no mesmo dispositivo e pedir somente a senha.
- Se os dados do navegador forem limpos, os ficheiros continuam online; para recuperar o acesso, será necessário informar o ID guardado e a senha.
- Nunca usar o endereço IP como identidade. O IP pode mudar e continuará servindo apenas para proteção contra abuso.

## Hospedagem online de 128 GB
- Aumentar o limite real de armazenamento por conta de dispositivo de 5 GB para 128 GB.
- Manter sites e ficheiros online de forma permanente, mesmo com o aparelho desligado.
- Preservar o armazenamento privado, domínios próprios, publicação de ficheiros e chaves de API existentes.
- Associar todos os dados ao utilizador interno protegido criado para o dispositivo, mantendo as regras de acesso atuais.

## Página inicial e navegação
- Transformar a landing page numa experiência preto e branco com superfícies translúcidas, reflexos, botões liquid glass e tipografia grande.
- Usar as duas fotografias de pessoas nas secções sobre proteção no dia a dia e empresas.
- Usar a referência dos três telemóveis como composição visual de produto, sem apresentar a marca externa como parte da GuardaWeb.
- Manter a fotografia de Isaac Muaco numa secção própria de CEO.
- Criar uma prévia realista do scanner, segurança e VPS com ícones Lucide.
- Remover links e textos de “Entrar” e “Criar conta”; usar “Abrir app” e “Aceder neste dispositivo”.

## Movimento e adaptação
- Usar Framer Motion para entradas suaves, brilho e deslocamentos discretos.
- Desativar ou reduzir os efeitos quando o dispositivo pedir menos movimento.
- Validar em 360 px, tablet e desktop, evitando cortes, sobreposições e botões apertados.

## Segurança e dados
- Criar uma tabela separada para identidades de dispositivo, com o ID armazenado apenas como hash.
- Guardar senhas exclusivamente no sistema de autenticação, nunca em tabelas, navegador ou código.
- Aplicar limites de tentativas por dispositivo e IP, respostas genéricas e validação no navegador e no servidor.
- Não expor e-mail técnico, chaves internas, credenciais ou detalhes da infraestrutura na interface.
- Corrigir também a consulta de BI: preencher a data somente quando a fonte oficial a fornecer e explicar quando for necessário completar manualmente.

## Validação final
- Confirmar criação, saída e reentrada com ID de dispositivo e senha.
- Confirmar que limpar o armazenamento local não apaga os dados online e que o ID de recuperação permite voltar.
- Confirmar o limite real de 128 GB na interface e no servidor.
- Verificar página inicial e app em móvel e desktop, compilação, erros de execução e segurança.
