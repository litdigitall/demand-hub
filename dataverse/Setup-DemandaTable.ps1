<#
  Setup-DemandaTable.ps1
  --------------------------------------------------------------------------
  Provisiona a tabela Dataverse "Demanda" (ardx_demanda), suas colunas e
  choices, dentro da solution "ARDXDemandSystem".

  Reutiliza o refresh token salvo em .dvauth.json (mesmo do conciliacao-app).
  Caso expire, regenera via -Stage auth.

  Uso:
    powershell -ExecutionPolicy Bypass -File ./Setup-DemandaTable.ps1
  --------------------------------------------------------------------------
#>
param(
  [ValidateSet('auth','deploy')] [string]$Stage = 'deploy',
  [string]$OrgUrl             = 'https://org2713c0e4.crm2.dynamics.com',
  [string]$TenantId           = '3926f3db-74b5-47bb-809a-a87b1dca77e1',
  [string]$ClientId           = '04b07795-8ddb-461a-bbee-02f9e1bf7b46',
  [string]$PublisherPrefix    = 'ardx',
  [int]   $OptionValuePrefix  = 50697,
  [string]$SolutionUniqueName = 'ARDXDemandSystem',
  [string]$AuthFile           = "$PSScriptRoot/.dvauth.json"
)
$ErrorActionPreference = 'Stop'
$OrgUrl = $OrgUrl.TrimEnd('/')

# ===================== STAGE: auth =====================
if ($Stage -eq 'auth') {
  $resp = Invoke-RestMethod -Method Post `
    -Uri "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/devicecode" `
    -Body @{ client_id = $ClientId; scope = "$OrgUrl/.default offline_access" }
  [pscustomobject]@{
    device_code = $resp.device_code
    interval    = $resp.interval
    expires_at  = (Get-Date).AddSeconds([int]$resp.expires_in).ToString('o')
    tenant      = $TenantId
    client_id   = $ClientId
    org_url     = $OrgUrl
  } | ConvertTo-Json | Set-Content -Path $AuthFile -Encoding utf8
  Write-Host "  Abra: $($resp.verification_uri)"
  Write-Host "  Codigo: $($resp.user_code)"
  return
}

# ===================== STAGE: deploy =====================
if (-not (Test-Path $AuthFile)) { throw "Arquivo $AuthFile nao encontrado. Rode -Stage auth primeiro." }
$auth = Get-Content $AuthFile -Raw | ConvertFrom-Json
if ($auth.org_url) { $OrgUrl = $auth.org_url }

$token = $null
$tokenUri = "https://login.microsoftonline.com/$($auth.tenant)/oauth2/v2.0/token"

# Tenta primeiro com refresh token (caso ja exista)
if ($auth.refresh_token) {
  try {
    $r = Invoke-RestMethod -Method Post -Uri $tokenUri -Body @{
      grant_type    = 'refresh_token'
      client_id     = $auth.client_id
      refresh_token = $auth.refresh_token
    }
    $token = $r.access_token
    if ($r.refresh_token) {
      $auth | Add-Member -NotePropertyName refresh_token -NotePropertyValue $r.refresh_token -Force
      $auth | ConvertTo-Json | Set-Content -Path $AuthFile -Encoding utf8
    }
    Write-Host "Sessao reutilizada via refresh_token."
  } catch { Write-Host "Refresh token invalido/expirado, tentando device code..." -ForegroundColor Yellow }
}

# Se nao deu, segue caminho device code (precisa ter rodado -Stage auth)
if (-not $token -and $auth.device_code) {
  Write-Host "Aguardando login no navegador..."
  $interval = [int]$auth.interval; if ($interval -lt 3) { $interval = 5 }
  while (-not $token) {
    Start-Sleep -Seconds $interval
    try {
      $r = Invoke-RestMethod -Method Post -Uri $tokenUri -Body @{
        grant_type  = 'urn:ietf:params:oauth:grant-type:device_code'
        client_id   = $auth.client_id
        device_code = $auth.device_code
      }
      $token = $r.access_token
      if ($r.refresh_token) {
        $auth | Add-Member -NotePropertyName refresh_token -NotePropertyValue $r.refresh_token -Force
        $auth | ConvertTo-Json | Set-Content -Path $AuthFile -Encoding utf8
      }
    } catch {
      $detail = $null
      try { $detail = ($_.ErrorDetails.Message | ConvertFrom-Json) } catch {}
      if ($detail -and $detail.error -eq 'authorization_pending') { continue }
      if ($detail -and $detail.error -eq 'slow_down') { $interval += 5; continue }
      $why = if ($detail) { $detail.error_description } else { $_.Exception.Message }
      throw "Falha no login: $why"
    }
  }
}

if (-not $token) { throw "Sem token. Rode -Stage auth primeiro." }
Write-Host "Login OK."

$api = "$OrgUrl/api/data/v9.2"
$headers = @{
  Authorization      = "Bearer $token"
  'OData-MaxVersion' = '4.0'
  'OData-Version'    = '4.0'
  Accept             = 'application/json'
}

function Dv {
  param([string]$Method,[string]$Path,$Body,[hashtable]$Extra)
  $h = @{} + $headers
  if ($Extra) { foreach ($k in $Extra.Keys) { $h[$k] = $Extra[$k] } }
  $uri = if ($Path -match '^https?://') { $Path } else { "$api/$Path" }
  $p = @{ Method = $Method; Uri = $uri; Headers = $h }
  if ($null -ne $Body) {
    $p.Body        = ($Body | ConvertTo-Json -Depth 25)
    $p.ContentType = 'application/json; charset=utf-8'
  }
  try { Invoke-RestMethod @p }
  catch {
    $msg = $_.Exception.Message
    try { $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).error.message } catch {}
    throw "$Method $Path -> $msg"
  }
}

# --- idioma base do ambiente ---
$lang = [int]((Dv GET "organizations?`$select=languagecode").value[0].languagecode)
Write-Host "Idioma base do ambiente: $lang"

function L([string]$t) {
  @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'
     LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $t; LanguageCode = $lang }) }
}
function Opt([string]$label,[int]$val) {
  @{ '@odata.type' = 'Microsoft.Dynamics.CRM.OptionMetadata'; Value = $val; Label = (L $label) }
}
function PicklistAttr([string]$schema,[string]$display,[array]$options) {
  @{
    '@odata.type'     = 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata'
    SchemaName        = $schema
    AttributeType     = 'Picklist'
    AttributeTypeName = @{ Value = 'PicklistType' }
    DisplayName       = (L $display)
    RequiredLevel     = @{ Value = 'None' }
    OptionSet         = @{
      '@odata.type'  = 'Microsoft.Dynamics.CRM.OptionSetMetadata'
      IsGlobal       = $false
      OptionSetType  = 'Picklist'
      Options        = $options
    }
  }
}

# --- publisher ---
$pub = (Dv GET "publishers?`$filter=customizationprefix eq '$PublisherPrefix'").value
if ($pub) {
  $pubId = $pub[0].publisherid
  Write-Host "Publisher '$PublisherPrefix' ja existe."
} else {
  Dv POST "publishers" @{
    uniquename                     = "${PublisherPrefix}publisher"
    friendlyname                   = 'ARDX'
    customizationprefix            = $PublisherPrefix
    customizationoptionvalueprefix = $OptionValuePrefix
  } | Out-Null
  $pubId = (Dv GET "publishers?`$filter=customizationprefix eq '$PublisherPrefix'").value[0].publisherid
  Write-Host "Publisher '$PublisherPrefix' criado."
}

# --- solution ---
$sol = (Dv GET "solutions?`$filter=uniquename eq '$SolutionUniqueName'").value
if ($sol) {
  Write-Host "Solution '$SolutionUniqueName' ja existe."
} else {
  Dv POST "solutions" @{
    uniquename                = $SolutionUniqueName
    friendlyname              = 'ARDX Demand System'
    version                   = '1.0.0.0'
    'publisherid@odata.bind'  = "/publishers($pubId)"
  } | Out-Null
  Write-Host "Solution '$SolutionUniqueName' criada."
}
$solHeader = @{ 'MSCRM.SolutionUniqueName' = $SolutionUniqueName }

# --- tabela ---
$entityLogical = "${PublisherPrefix}_demanda"
$entityExists  = $true
try { Dv GET "EntityDefinitions(LogicalName='$entityLogical')?`$select=LogicalName" | Out-Null }
catch { $entityExists = $false }

if (-not $entityExists) {
  $entity = @{
    '@odata.type'         = 'Microsoft.Dynamics.CRM.EntityMetadata'
    SchemaName            = "${PublisherPrefix}_Demanda"
    DisplayName           = (L 'Demanda')
    DisplayCollectionName = (L 'Demandas')
    Description           = (L 'Intake de demandas de IT - modulo ARDX Demand System.')
    OwnershipType         = 'UserOwned'
    IsActivity            = $false
    HasActivities         = $false
    HasNotes              = $true
    IsAuditEnabled        = @{ Value = $true }
    Attributes            = @(
      @{
        '@odata.type'     = 'Microsoft.Dynamics.CRM.StringAttributeMetadata'
        SchemaName        = "${PublisherPrefix}_Titulo"
        AttributeType     = 'String'
        AttributeTypeName = @{ Value = 'StringType' }
        MaxLength         = 200
        IsPrimaryName     = $true
        DisplayName       = (L 'Titulo')
        RequiredLevel     = @{ Value = 'ApplicationRequired' }
      }
    )
  }
  Dv POST "EntityDefinitions" $entity $solHeader | Out-Null
  Write-Host "Tabela criada: $entityLogical"
} else {
  Write-Host "Tabela ja existe: $entityLogical"
}

# --- colunas ---
$existing = @((Dv GET "EntityDefinitions(LogicalName='$entityLogical')/Attributes?`$select=SchemaName").value.SchemaName)
function Add-Attr($def) {
  if ($existing -contains $def.SchemaName) { Write-Host "  = $($def.SchemaName)"; return }
  Dv POST "EntityDefinitions(LogicalName='$entityLogical')/Attributes" $def $solHeader | Out-Null
  Write-Host "  + $($def.SchemaName)"
}

function Str($schema,$display,$max=255,$required='None',$format=$null) {
  $a = @{
    '@odata.type'='Microsoft.Dynamics.CRM.StringAttributeMetadata'
    SchemaName=$schema; AttributeType='String'
    AttributeTypeName=@{Value='StringType'}; MaxLength=$max
    DisplayName=(L $display); RequiredLevel=@{Value=$required}
  }
  if ($format) { $a.FormatName = @{Value=$format} }
  return $a
}
function Memo($schema,$display,$max=4000) {
  @{
    '@odata.type'='Microsoft.Dynamics.CRM.MemoAttributeMetadata'
    SchemaName=$schema; AttributeType='Memo'
    AttributeTypeName=@{Value='MemoType'}; MaxLength=$max
    DisplayName=(L $display); RequiredLevel=@{Value='None'}
  }
}
function DateOnly($schema,$display) {
  @{
    '@odata.type'='Microsoft.Dynamics.CRM.DateTimeAttributeMetadata'
    SchemaName=$schema; AttributeType='DateTime'
    AttributeTypeName=@{Value='DateTimeType'}; Format='DateOnly'
    DateTimeBehavior=@{Value='DateOnly'}
    DisplayName=(L $display); RequiredLevel=@{Value='None'}
  }
}
function MoneyDec($schema,$display) {
  @{
    '@odata.type'='Microsoft.Dynamics.CRM.DecimalAttributeMetadata'
    SchemaName=$schema; AttributeType='Decimal'
    AttributeTypeName=@{Value='DecimalType'}; Precision=2
    MinValue=0; MaxValue=100000000000
    DisplayName=(L $display); RequiredLevel=@{Value='None'}
  }
}
function IntNum($schema,$display,$min=0,$max=999) {
  @{
    '@odata.type'='Microsoft.Dynamics.CRM.IntegerAttributeMetadata'
    SchemaName=$schema; AttributeType='Integer'
    AttributeTypeName=@{Value='IntegerType'}
    MinValue=$min; MaxValue=$max
    DisplayName=(L $display); RequiredLevel=@{Value='None'}
  }
}
function YesNo($schema,$display) {
  @{
    '@odata.type'='Microsoft.Dynamics.CRM.BooleanAttributeMetadata'
    SchemaName=$schema; AttributeType='Boolean'
    AttributeTypeName=@{Value='BooleanType'}; DefaultValue=$false
    DisplayName=(L $display); RequiredLevel=@{Value='None'}
    OptionSet=@{
      '@odata.type'='Microsoft.Dynamics.CRM.BooleanOptionSetMetadata'
      TrueOption =@{ Value=1; Label=(L 'Sim') }
      FalseOption=@{ Value=0; Label=(L 'Nao') }
    }
  }
}

$b = $OptionValuePrefix * 10000   # base dos valores de choice

# --- 1. Identificacao ---
Add-Attr (Str "${PublisherPrefix}_Numero" 'Numero' 32 'None')
Add-Attr (Memo "${PublisherPrefix}_Descricao" 'Descricao' 4000)
Add-Attr (Str "${PublisherPrefix}_AreaSolicitante" 'Area Solicitante' 200)
Add-Attr (Str "${PublisherPrefix}_Solicitante" 'Solicitante' 200)
Add-Attr (Str "${PublisherPrefix}_Email" 'Email' 200 'None' 'Email')
Add-Attr (Str "${PublisherPrefix}_Telefone" 'Telefone' 50)
Add-Attr (DateOnly "${PublisherPrefix}_DataSolicitacao" 'Data da Solicitacao')

# --- 2. Objetivo & Justificativa ---
Add-Attr (Memo "${PublisherPrefix}_ProblemaResolve" 'Problema que Resolve')
Add-Attr (Memo "${PublisherPrefix}_ObjetivoPrincipal" 'Objetivo Principal')
Add-Attr (Memo "${PublisherPrefix}_ProcessosImpactados" 'Processos Impactados')
Add-Attr (Memo "${PublisherPrefix}_ConsequenciaNaoExecucao" 'Consequencia de nao Executar')

# --- 3. Tipo ---
Add-Attr (PicklistAttr "${PublisherPrefix}_Tipo" 'Tipo de Demanda' @(
  (Opt 'Projeto novo' ($b+0)),
  (Opt 'Melhoria de sistema' ($b+1)),
  (Opt 'Correcao Bug' ($b+2)),
  (Opt 'Compliance Regulatorio' ($b+3)),
  (Opt 'Infraestrutura' ($b+4)),
  (Opt 'Seguranca da Informacao' ($b+5)),
  (Opt 'Automacao Digitalizacao' ($b+6))
))

# --- 4. Impacto no Negocio ---
Add-Attr (PicklistAttr "${PublisherPrefix}_ImpactoNivel" 'Impacto Estimado' @(
  (Opt 'Alto' ($b+0)),
  (Opt 'Medio' ($b+1)),
  (Opt 'Baixo' ($b+2))
))
Add-Attr (Str "${PublisherPrefix}_TiposImpacto" 'Tipos de Impacto (CSV)' 200)
Add-Attr (MoneyDec "${PublisherPrefix}_ValorEstimado" 'Valor Estimado')

# --- 5. Urgencia ---
Add-Attr (PicklistAttr "${PublisherPrefix}_Urgencia" 'Urgencia' @(
  (Opt 'Critico' ($b+0)),
  (Opt 'Alto' ($b+1)),
  (Opt 'Medio' ($b+2)),
  (Opt 'Baixo' ($b+3))
))
Add-Attr (DateOnly "${PublisherPrefix}_Deadline" 'Deadline')

# --- 6. Escopo Tecnico ---
Add-Attr (Memo "${PublisherPrefix}_SistemasEnvolvidos" 'Sistemas Envolvidos')
Add-Attr (Memo "${PublisherPrefix}_IntegracoesNecessarias" 'Integracoes Necessarias')
Add-Attr (Memo "${PublisherPrefix}_RequisitosPrincipais" 'Requisitos Principais')
Add-Attr (Memo "${PublisherPrefix}_SolucaoProposta" 'Solucao Proposta')

# --- 7. Stakeholders ---
Add-Attr (Str "${PublisherPrefix}_Sponsor" 'Sponsor' 200)
Add-Attr (Str "${PublisherPrefix}_DonoProcesso" 'Dono do Processo' 200)
Add-Attr (Str "${PublisherPrefix}_AreasEnvolvidas" 'Areas Envolvidas' 500)

# --- 8. Compliance ---
Add-Attr (YesNo "${PublisherPrefix}_DadosSensiveis" 'Dados Sensiveis (LGPD)')
Add-Attr (YesNo "${PublisherPrefix}_ImpactaSeguranca" 'Impacta Seguranca')
Add-Attr (YesNo "${PublisherPrefix}_RequerAuditoria" 'Requer Auditoria')

# --- 9. Esforco ---
Add-Attr (PicklistAttr "${PublisherPrefix}_EsforcoEstimado" 'Esforco Estimado' @(
  (Opt 'Pequeno (<1 mes)' ($b+0)),
  (Opt 'Medio (1-3 meses)' ($b+1)),
  (Opt 'Grande (3+ meses)' ($b+2))
))

# --- Workflow + Scoring ---
Add-Attr (PicklistAttr "${PublisherPrefix}_Status" 'Status' @(
  (Opt 'Nova' ($b+0)),
  (Opt 'Em analise' ($b+1)),
  (Opt 'Priorizada' ($b+2)),
  (Opt 'Em execucao' ($b+3)),
  (Opt 'Concluida' ($b+4)),
  (Opt 'Recusada' ($b+5))
))
Add-Attr (Str "${PublisherPrefix}_ProjectStage" 'Project Stage' 60)
Add-Attr (IntNum "${PublisherPrefix}_FinalPriority" 'Final Priority' 0 9999)
Add-Attr (IntNum "${PublisherPrefix}_ScoreBusinessImpact" 'Score Business Impact' 1 5)
Add-Attr (IntNum "${PublisherPrefix}_ScoreRisk" 'Score Risk' 1 5)
Add-Attr (IntNum "${PublisherPrefix}_ScoreTechnical" 'Score Technical' 1 5)
Add-Attr (IntNum "${PublisherPrefix}_ScoreRevenue" 'Score Revenue' 1 5)
Add-Attr (IntNum "${PublisherPrefix}_ScoreStrategic" 'Score Strategic' 1 5)
Add-Attr (IntNum "${PublisherPrefix}_ScoreStakeholder" 'Score Stakeholder' 1 5)
Add-Attr (IntNum "${PublisherPrefix}_ScoreUrgency" 'Score Urgency' 1 5)
Add-Attr (Str "${PublisherPrefix}_ScoreFlags" 'Score Flags (CSV)' 500)

# --- JSON blobs para comentarios, anexos e avaliacoes do score ---
Add-Attr (Memo "${PublisherPrefix}_ComentariosJson" 'Comentarios (JSON)' 100000)
Add-Attr (Memo "${PublisherPrefix}_AnexosJson" 'Anexos (JSON)' 30000)
Add-Attr (Memo "${PublisherPrefix}_AvaliacoesJson" 'Avaliacoes do Score (JSON)' 60000)
Add-Attr (Str  "${PublisherPrefix}_StackValidadaPor" 'Stack Validada Por' 200)
Add-Attr (DateOnly "${PublisherPrefix}_StackValidadaEm" 'Stack Validada Em')

# --- Aprovacoes (workflow) + alocacao por time ---
Add-Attr (Memo "${PublisherPrefix}_AprovacoesJson" 'Aprovacoes (JSON)' 60000)
Add-Attr (Str  "${PublisherPrefix}_Time" 'Time Responsavel' 200)
Add-Attr (IntNum "${PublisherPrefix}_HorasEstimadas" 'Horas Estimadas' 0 100000)

# --- Fluxo end-to-end: Business response, DMC e integracoes ---
Add-Attr (Memo "${PublisherPrefix}_RespostaBusiness" 'Resposta do Business' 4000)
Add-Attr (YesNo "${PublisherPrefix}_DmcAprovado" 'DMC Aprovou')
Add-Attr (DateOnly "${PublisherPrefix}_DmcData" 'Data Decisao DMC')
Add-Attr (Memo "${PublisherPrefix}_DmcComentario" 'Comentario do DMC' 4000)
Add-Attr (Str  "${PublisherPrefix}_IdServiceNow" 'ID ServiceNow' 100)
Add-Attr (Str  "${PublisherPrefix}_IdProjeto" 'ID Projeto' 100)

# --- publicar ---
Write-Host "Publicando customizacoes..."
Dv POST "PublishAllXml" @{} | Out-Null

# --- resumo / schema-info ---
$meta = Dv GET "EntityDefinitions(LogicalName='$entityLogical')?`$select=LogicalName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute"
$schemaInfo = [ordered]@{
  environmentOrgUrl = $OrgUrl
  solution          = $SolutionUniqueName
  table             = @{
    logicalName        = $meta.LogicalName
    entitySetName      = $meta.EntitySetName
    primaryIdAttribute = $meta.PrimaryIdAttribute
    primaryName        = $meta.PrimaryNameAttribute
  }
  choices = @{
    tipo = @{
      ProjetoNovo=($b+0); MelhoriaSistema=($b+1); CorrecaoBug=($b+2)
      Compliance=($b+3); Infraestrutura=($b+4); Seguranca=($b+5); Automacao=($b+6)
    }
    impactoNivel  = @{ Alto=($b+0); Medio=($b+1); Baixo=($b+2) }
    urgencia      = @{ Critico=($b+0); Alto=($b+1); Medio=($b+2); Baixo=($b+3) }
    esforco       = @{ Pequeno=($b+0); Medio=($b+1); Grande=($b+2) }
    status        = @{ Nova=($b+0); EmAnalise=($b+1); Priorizada=($b+2); EmExecucao=($b+3); Concluida=($b+4); Recusada=($b+5) }
  }
}
$schemaInfo | ConvertTo-Json -Depth 6 | Set-Content -Path "$PSScriptRoot/schema-info.json" -Encoding utf8

Write-Host ""
Write-Host "=================================================================="
Write-Host "  TABELA PRONTA"
Write-Host "  logicalName   : $($meta.LogicalName)"
Write-Host "  entitySetName : $($meta.EntitySetName)"
Write-Host "  solution      : $SolutionUniqueName"
Write-Host "  schema-info   : dataverse/schema-info.json"
Write-Host "=================================================================="
