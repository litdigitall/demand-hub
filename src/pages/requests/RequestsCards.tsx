/* ============================================================
   Requests · Cards — a mesma lista em telas estreitas.
   A tabela tem 8 colunas: no celular ela vira scroll lateral e o
   título fica em "Wi-Fi co…". Aqui cada demanda é um cartão com o
   que importa para decidir se abre ou não: título, quem está
   devendo a próxima ação, área, score e status.
   ============================================================ */
import { useNavigate } from "react-router-dom";
import { Card, Group, Stack, Text } from "@mantine/core";
import {
  CATEGORIA_VIEW_LABEL,
  clasificacionEfetiva,
  weightedScore,
  type Demand,
} from "../../data/types";
import { StatusBadge } from "../../components/Badges";
import { formatDate } from "../../lib/format";
import { isOverdue, waitingLabel } from "./useRequests";

export function RequestsCards({ items }: { items: Demand[] }) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <Text size="sm" c="dimmed" py="sm">
        No requests match the current filters.
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      {items.map((d) => {
        const cat = clasificacionEfetiva(d);
        const late = isOverdue(d);
        return (
          <Card
            key={d.id}
            withBorder
            radius="md"
            padding="md"
            tabIndex={0}
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/demandas/${d.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate(`/demandas/${d.id}`);
            }}
          >
            <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
              <Text fw={600} size="sm" style={{ minWidth: 0 }}>
                {d.titulo}
              </Text>
              <Text size="sm" fw={700} c="abbott.7" style={{ whiteSpace: "nowrap" }}>
                {weightedScore(d.score).toFixed(2)}
              </Text>
            </Group>

            <Text size="xs" c="dimmed" mt={4}>
              {d.numero} · {CATEGORIA_VIEW_LABEL[cat]} · {waitingLabel(d)}
            </Text>

            <Group gap="xs" mt="sm" wrap="wrap">
              <StatusBadge value={d.status} />
              {d.deadline && (
                <Text size="xs" c={late ? "red.7" : "dimmed"} fw={late ? 700 : 400}>
                  {formatDate(d.deadline)}
                </Text>
              )}
            </Group>
          </Card>
        );
      })}
    </Stack>
  );
}
