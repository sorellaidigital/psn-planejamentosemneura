# psn-pauta-upload

Recebe o PNG de um slide e grava no bucket público `psn-pautas` em `<pauta>/<NN>.png` (upsert). Usada pelo
`pipeline.psn producao ... entregar` (mecanismo-car). Deploy com `verify_jwt=false`; a autenticação é o header `x-psn-segredo`.

## Contrato

`POST https://hvmmkwafzeqbjpusdmin.supabase.co/functions/v1/psn-pauta-upload?pauta=<uuid>&n=<1..20>`

- Header `x-psn-segredo`: o mesmo `PSN_ROTINA_SEGREDO` das RPCs (Vault `psn_ig_rotina`, conferido por `psn_pauta_segredo_ok`).
- Corpo: binário com `Content-Type: image/png|image/jpeg`, ou `multipart/form-data` com o campo `file`. Máx. 10 MB.
- A pauta precisa existir e estar em `em_producao`, `para_revisar` ou `ajustar`.
- 200 `{ok:true, path}` (`<pauta>/<NN>.png`; JPEG vira `.jpg`) · 400 entrada inválida · 401 sem/errado segredo · 404 pauta inexistente · 409 status não permite · 413 grande demais.
- URL pública: `https://hvmmkwafzeqbjpusdmin.supabase.co/storage/v1/object/public/psn-pautas/<path>`.

Exemplo: `curl -X POST -H "x-psn-segredo: $PSN_ROTINA_SEGREDO" -H "content-type: image/png" --data-binary @01.png "<url>?pauta=<uuid>&n=1"`.

Testes: `deno test -A` nesta pasta.
