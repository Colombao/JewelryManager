# Etiquetas BarTender

Template usado pelo CRM na tela **Produtos → Imprimir etiquetas**:

- `Documento2.btw` — BarTender 2022 Enterprise, 48,7 × 15 mm, impressora Argox OS-214 (PPLA)

## Instalação no PC que imprime

1. Instale o **BarTender** (Automation/Enterprise) com a API local na porta `5159`.
2. Copie `Documento2.btw` para um caminho fixo, por exemplo `C:\Etiquetas\Documento2.btw`.
3. Abra o documento no BarTender e garanta que as **Named Data Sources** existam (ou renomeie as do formulário) para bater com o app:
   - `Nome`, `Codigo`, `SKU`, `Preco`, `Barcode`, `Categoria` (também são enviados aliases em inglês)
4. Conecte a Argox e deixe-a como impressora do documento (ou informe o nome no diálogo do CRM).
5. No CRM (`/produtos`), clique em **Imprimir etiquetas**, escolha o tipo (Brinco, Pulseira, …), marque os produtos e imprima.

As configurações de caminho/API/impressora ficam salvas no `localStorage` desse navegador.

## Variáveis de ambiente (opcional)

No `jewlery-app/.env.local`:

```env
NEXT_PUBLIC_BARTENDER_API_URL=http://localhost:5159
NEXT_PUBLIC_BARTENDER_DOCUMENT=C:\Etiquetas\Documento2.btw
NEXT_PUBLIC_BARTENDER_PRINTER=Argox OS-214 plus series PPLA
```
