import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Anchor,
  Badge,
  Box,
  Card,
  Center,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
  Avatar,
} from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n";
import { ROLE_LABEL, ROLE_COLOR, type Persona } from "../domain/roles";
import { initialsFromName } from "../lib/format";
import abbottLogo from "../assets/abbott-logo.png";

export function LoginPage() {
  const navigate = useNavigate();
  const { signInAs, user, personas } = useAuth();
  const { t } = useT();

  // Redireciona via efeito (nunca durante o render — evita setState-in-render).
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  function entrar(p: Persona) {
    if (signInAs(p.id)) navigate("/", { replace: true });
  }

  return (
    <Box
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, var(--mantine-color-abbott-9) 0%, var(--mantine-color-abbott-7) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <Card withBorder radius="lg" padding="xl" shadow="xl" style={{ width: "100%", maxWidth: 760 }}>
        <Stack align="center" gap="xs" mb="lg">
          <Box style={{ background: "#fff", borderRadius: 12, padding: "10px 16px" }}>
            <img src={abbottLogo} alt="Abbott" style={{ maxWidth: 130, display: "block" }} />
          </Box>
          <Title order={2} c="abbott.8">
            {t("appName")}
          </Title>
          <Text size="sm" c="dimmed">
            Elige un perfil para entrar (demo). Cada perfil ve lo que le corresponde en el flujo.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {personas.map((p) => (
            <UnstyledButton
              key={p.id}
              onClick={() => entrar(p)}
              style={{
                border: "1px solid var(--mantine-color-gray-3)",
                borderRadius: 12,
                padding: "14px 16px",
                transition: "all .15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--mantine-color-abbott-5)";
                e.currentTarget.style.background = "var(--mantine-color-gray-0)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--mantine-color-gray-3)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Group wrap="nowrap" gap="sm">
                <Avatar radius="xl" size={44} color="abbott.6" variant="filled">
                  {initialsFromName(p.nome)}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Group gap={6} justify="space-between" wrap="nowrap">
                    <Text fw={600} truncate>
                      {p.nome}
                    </Text>
                    <IconArrowRight size={16} color="var(--mantine-color-gray-5)" />
                  </Group>
                  <Text size="xs" c="dimmed" truncate>
                    {p.cargo}
                  </Text>
                  <Group gap={4} mt={6}>
                    {p.roles.slice(0, 3).map((r) => (
                      <Badge key={r} size="xs" variant="light" color={ROLE_COLOR[r]}>
                        {ROLE_LABEL[r]}
                      </Badge>
                    ))}
                    {p.roles.length > 3 && (
                      <Badge size="xs" variant="light" color="gray">
                        +{p.roles.length - 3}
                      </Badge>
                    )}
                  </Group>
                </div>
              </Group>
            </UnstyledButton>
          ))}
        </SimpleGrid>

        <Center mt="lg">
          <Text size="sm">
            ¿Solo querés enviar una solicitud?{" "}
            <Anchor component={Link} to="/solicitar" fw={600}>
              Formulario público →
            </Anchor>
          </Text>
        </Center>
        <Center mt={4}>
          <Text size="xs" c="dimmed">
            {t("appDemoFooter")}
          </Text>
        </Center>
      </Card>
    </Box>
  );
}
