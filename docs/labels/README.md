# Etiquetas BarTender

Template: `Documento2.btw` — BarTender 2022 Enterprise, 48,7 × 15 mm, **2 templates** (2 produtos por linha), Argox OS-214.

## Como o CRM imprime

Na tela **Produtos → Imprimir etiquetas**, ao marcar ex. BR13, BR14 e BR15:

1. O app monta **um único request** ao BarTender (`localhost:5159`)
2. Envia os 3 registros juntos (CSV / RecordSet)
3. Com 2 templates, a impressora deve sair assim:
   - Linha 1: **BR13 | BR14**
   - Linha 2: **BR15**

## Configuração obrigatória no .btw (senão sai tudo BR01)

Se o texto do código estiver **fixo** no documento (valor de exemplo `BR01`), o BarTender ignora os dados do CRM.

No BarTender Designer, para cada objeto da etiqueta:

1. Abra as propriedades da fonte de dados
2. Troque de “Dados inseridos” / valor fixo para:
   - **Campo de banco de texto** `code`, `name`, `sku`, `price`, `barcode`, `category`  
     (o CRM cria/substitui o “Text File 1” com esses nomes), **ou**
   - **Named Data Source** com exatamente esses nomes (não use `Codigo`/`Preco`)
3. Salve o `Documento2.btw`

## Pasta no PC

1. BarTender Enterprise com API na porta `5159`
2. `Documento2.btw` em uma pasta fixa (ex.: `C:\Users\AlmaW\Desktop\bartender\Documento2.btw`)
3. No CRM: **Selecionar arquivo .btw** + confirmar a pasta

## Variáveis (opcional)

```env
NEXT_PUBLIC_BARTENDER_API_URL=http://localhost:5159
NEXT_PUBLIC_BARTENDER_DOCUMENT=C:\Users\AlmaW\Desktop\bartender\Documento2.btw
NEXT_PUBLIC_BARTENDER_PRINTER=Argox OS-214 plus series PPLA
```
