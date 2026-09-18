# Environment variables — ainda não estão na solution

As 10 definições aqui foram escritas à mão e **o Dataverse recusou o import**
(async operation Failed, sem mensagem). Testei sem obrigatoriedade e com GUID
de registro; falhou dos dois jeitos. Não há nenhuma variável de ambiente neste
tenant para eu usar de molde.

**O caminho certo é o inverso:** criar cada variável no maker portal *dentro
da solution* e trazer para cá pelo `pac solution export` + `unpack`. Aí o XML
vem no formato exato que o servidor aceita, em vez de eu adivinhar.

Estes arquivos ficam como especificação do que criar: nome, tipo, padrão e
quem consome cada uma estão na tabela do `docs/ALM-SOLUTION.md` §1.

Depois de criadas e exportadas, apague esta pasta.
