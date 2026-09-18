/* Dicionários de tradução PT / EN / ES — todas as keys da interface. */

export type Lang = "pt" | "en" | "es";

const PT = {
  /* App */

  /* Sidebar */

  /* Comum */
  back: "Voltar",
  cancel: "Cancelar",
  delete: "Excluir",
  approve: "Aprovar",
  reject: "Recusar",
  reopen: "Reabrir",
  comment: "Comentário",
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
  status: "Status",
  yes: "Sim",
  no: "Não",

  /* Dashboard */

  /* Aprovações */
  apr_workflow: "Fluxo de aprovação",
  apr_workflow_help: "Toda demanda passa por 3 níveis de aprovação. O próximo aprovador recebe a notificação quando o anterior libera.",
  apr_youAreNext: "Você é o próximo aprovador",

  /* Capacity */
  cap_title: "Capacity dos times",
  cap_subtitle: "Horas alocadas vs disponíveis (demandas em execução)",
  cap_team: "Time",
  cap_capacity: "Capacidade mensal",
  cap_allocated: "Alocado",
  cap_available: "Disponível",
  cap_utilization: "Utilização",
  cap_demands: "demandas",
  cap_internal: "Implantação Interna",
  cap_external: "Implantação Externa",
  cap_support: "Sustentação",
  cap_team_help: "Equipe interna da LIT Digitall",
  cap_team_help_ext: "Consultorias externas",
  cap_team_help_sus: "Tickets recorrentes e melhorias contínuas",
  cap_total_utilization: "Utilização (total)",
  cap_overallocated: "Sobrealocado",
  cap_limit: "Limite",
  cap_ok: "OK",
  cap_help: "Como calculamos: capacidade ÷ horas alocadas das demandas em status Priorizada e Em execução.",

  /* Lista de demandas */

  /* Score Board */

  /* Kanban */

  /* Sponsors */

  /* Detail */
  detail_overview: "Visão geral",
  detail_scoring: "Scoring",
  detail_approvals: "Aprovações",
  detail_comments: "Comentários",
  detail_deleteTitle: "Excluir demanda?",
  detail_deleteWarn: "Esta ação não pode ser desfeita. A demanda {numero} será removida do sistema.",
  detail_lastUpdate: "Última modificação",
  detail_score_label: "Score ponderado",
  detail_project_stage: "Project Stage",
  detail_section_basic: "Informações Básicas",
  detail_section_objective: "Objetivo & Justificativa",
  detail_section_impact: "Impacto no Negócio",
  detail_section_urgency: "Urgência e Prazo",
  detail_section_stakeholders: "Stakeholders",
  detail_section_compliance: "Compliance & Risco",
  detail_label_title: "Título",
  detail_label_description: "Descrição",
  detail_label_area: "Área solicitante",
  detail_label_requester: "Solicitante",
  detail_label_email: "E-mail",
  detail_label_phone: "Telefone",
  detail_label_problem: "Problema que resolve",
  detail_label_objective: "Objetivo principal",
  detail_label_processes: "Processos impactados",
  detail_label_consequence: "Consequência de não executar",
  detail_label_impactLevel: "Nível",
  detail_label_estimatedValue: "Valor estimado",
  detail_label_impactTypes: "Tipos de impacto",
  detail_label_urgency: "Urgência",
  detail_label_deadline: "Deadline",
  detail_label_effort: "Esforço estimado",
  detail_label_sponsor: "Sponsor",
  detail_label_processOwner: "Dono do processo",
  detail_label_areasInvolved: "Áreas envolvidas",
  detail_label_pii: "Dados sensíveis (LGPD)",
  detail_label_security: "Impacta segurança",
  detail_label_audit: "Requer auditoria",
  detail_comments_addLabel: "Adicionar comentário",
  detail_comments_placeholder: "Escreva um comentário...",
  detail_comments_post: "Postar",
  detail_comments_none: "Sem comentários ainda.",
  detail_saved: "Salvo",
  detail_savedChanges: "Alterações salvas.",
  detail_demandRemoved: "Demanda removida",
  detail_notFound: "Demanda não encontrada",
  detail_backToList: "Voltar à lista",

  /* Nova Demanda (stepper) */

  /* Admin */

  /* Workflow Timeline */

  /* Fluxo Panel */

  /* Enum: Status */

  /* Enum: Tipo */

  /* Enum: Impacto */

  /* Enum: Tipo de Impacto */

  /* Enum: Urgência */

  /* Enum: Esforço */

  /* Enum: Nível Aprovação */
};

type Dict = typeof PT;

const EN: Dict = {


  back: "Back",
  cancel: "Cancel",
  delete: "Delete",
  approve: "Approve",
  reject: "Reject",
  reopen: "Reopen",
  comment: "Comment",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  status: "Status",
  yes: "Yes",
  no: "No",


  apr_workflow: "Approval workflow",
  apr_workflow_help: "Every demand goes through 3 approval levels. The next approver is notified when the previous one releases.",
  apr_youAreNext: "You're the next approver",

  cap_title: "Team capacity",
  cap_subtitle: "Allocated vs available hours (demands in progress)",
  cap_team: "Team",
  cap_capacity: "Monthly capacity",
  cap_allocated: "Allocated",
  cap_available: "Available",
  cap_utilization: "Utilization",
  cap_demands: "demands",
  cap_internal: "Internal Delivery",
  cap_external: "External Delivery",
  cap_support: "Support",
  cap_team_help: "Internal LIT Digitall team",
  cap_team_help_ext: "External consultancies",
  cap_team_help_sus: "Recurring tickets and continuous improvements",
  cap_total_utilization: "Utilization (total)",
  cap_overallocated: "Overallocated",
  cap_limit: "Near limit",
  cap_ok: "OK",
  cap_help: "How we compute: capacity ÷ allocated hours of demands in Prioritized or In Progress status.",





  detail_overview: "Overview",
  detail_scoring: "Scoring",
  detail_approvals: "Approvals",
  detail_comments: "Comments",
  detail_deleteTitle: "Delete demand?",
  detail_deleteWarn: "This action cannot be undone. Demand {numero} will be permanently removed.",
  detail_lastUpdate: "Last update",
  detail_score_label: "Weighted score",
  detail_project_stage: "Project Stage",
  detail_section_basic: "Basic Information",
  detail_section_objective: "Goal & Rationale",
  detail_section_impact: "Business Impact",
  detail_section_urgency: "Urgency & Deadline",
  detail_section_stakeholders: "Stakeholders",
  detail_section_compliance: "Compliance & Risk",
  detail_label_title: "Title",
  detail_label_description: "Description",
  detail_label_area: "Requester area",
  detail_label_requester: "Requester",
  detail_label_email: "E-mail",
  detail_label_phone: "Phone",
  detail_label_problem: "Problem it solves",
  detail_label_objective: "Main goal",
  detail_label_processes: "Impacted processes",
  detail_label_consequence: "Consequence of not doing",
  detail_label_impactLevel: "Level",
  detail_label_estimatedValue: "Estimated value",
  detail_label_impactTypes: "Impact types",
  detail_label_urgency: "Urgency",
  detail_label_deadline: "Deadline",
  detail_label_effort: "Estimated effort",
  detail_label_sponsor: "Sponsor",
  detail_label_processOwner: "Process owner",
  detail_label_areasInvolved: "Areas involved",
  detail_label_pii: "Sensitive data (LGPD)",
  detail_label_security: "Impacts security",
  detail_label_audit: "Requires audit",
  detail_comments_addLabel: "Add comment",
  detail_comments_placeholder: "Write a comment...",
  detail_comments_post: "Post",
  detail_comments_none: "No comments yet.",
  detail_saved: "Saved",
  detail_savedChanges: "Changes saved.",
  detail_demandRemoved: "Demand removed",
  detail_notFound: "Demand not found",
  detail_backToList: "Back to list",











};

const ES: Dict = {


  back: "Volver",
  cancel: "Cancelar",
  delete: "Eliminar",
  approve: "Aprobar",
  reject: "Rechazar",
  reopen: "Reabrir",
  comment: "Comentario",
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  status: "Estado",
  yes: "Sí",
  no: "No",


  apr_workflow: "Flujo de aprobación",
  apr_workflow_help: "Toda demanda pasa por 3 niveles de aprobación. El siguiente aprobador recibe la notificación cuando el anterior libera.",
  apr_youAreNext: "Tú eres el siguiente aprobador",

  cap_title: "Capacidad de los equipos",
  cap_subtitle: "Horas asignadas vs disponibles (demandas en ejecución)",
  cap_team: "Equipo",
  cap_capacity: "Capacidad mensual",
  cap_allocated: "Asignado",
  cap_available: "Disponible",
  cap_utilization: "Utilización",
  cap_demands: "demandas",
  cap_internal: "Implementación Interna",
  cap_external: "Implementación Externa",
  cap_support: "Sostenibilidad",
  cap_team_help: "Equipo interno de LIT Digitall",
  cap_team_help_ext: "Consultorías externas",
  cap_team_help_sus: "Tickets recurrentes y mejoras continuas",
  cap_total_utilization: "Utilización (total)",
  cap_overallocated: "Sobreasignado",
  cap_limit: "Límite",
  cap_ok: "OK",
  cap_help: "Cómo calculamos: capacidad ÷ horas asignadas de las demandas en estado Priorizada y En ejecución.",





  detail_overview: "Visión general",
  detail_scoring: "Scoring",
  detail_approvals: "Aprobaciones",
  detail_comments: "Comentarios",
  detail_deleteTitle: "¿Eliminar demanda?",
  detail_deleteWarn: "Esta acción no se puede deshacer. La demanda {numero} será eliminada del sistema.",
  detail_lastUpdate: "Última modificación",
  detail_score_label: "Score ponderado",
  detail_project_stage: "Project Stage",
  detail_section_basic: "Información Básica",
  detail_section_objective: "Objetivo y Justificación",
  detail_section_impact: "Impacto en el Negocio",
  detail_section_urgency: "Urgencia y Plazo",
  detail_section_stakeholders: "Stakeholders",
  detail_section_compliance: "Compliance y Riesgo",
  detail_label_title: "Título",
  detail_label_description: "Descripción",
  detail_label_area: "Área solicitante",
  detail_label_requester: "Solicitante",
  detail_label_email: "E-mail",
  detail_label_phone: "Teléfono",
  detail_label_problem: "Problema que resuelve",
  detail_label_objective: "Objetivo principal",
  detail_label_processes: "Procesos impactados",
  detail_label_consequence: "Consecuencia de no ejecutar",
  detail_label_impactLevel: "Nivel",
  detail_label_estimatedValue: "Valor estimado",
  detail_label_impactTypes: "Tipos de impacto",
  detail_label_urgency: "Urgencia",
  detail_label_deadline: "Deadline",
  detail_label_effort: "Esfuerzo estimado",
  detail_label_sponsor: "Sponsor",
  detail_label_processOwner: "Dueño del proceso",
  detail_label_areasInvolved: "Áreas involucradas",
  detail_label_pii: "Datos sensibles (LGPD)",
  detail_label_security: "Impacta seguridad",
  detail_label_audit: "Requiere auditoría",
  detail_comments_addLabel: "Agregar comentario",
  detail_comments_placeholder: "Escribe un comentario...",
  detail_comments_post: "Publicar",
  detail_comments_none: "Sin comentarios todavía.",
  detail_saved: "Guardado",
  detail_savedChanges: "Cambios guardados.",
  detail_demandRemoved: "Demanda eliminada",
  detail_notFound: "Demanda no encontrada",
  detail_backToList: "Volver a la lista",











};

export const dicts = { pt: PT, en: EN, es: ES } as const;
export type TKey = keyof typeof PT;
