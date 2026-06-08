import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  Center,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconLock, IconUser } from "@tabler/icons-react";
import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n";
import abbottLogo from "../assets/abbott-logo.png";

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const { t, lang, setLang } = useT();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate("/", { replace: true });
    return null;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    setTimeout(() => {
      const ok = signIn(u, p);
      setLoading(false);
      if (ok) navigate("/", { replace: true });
      else setError(true);
    }, 400);
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
        padding: "1rem",
        position: "relative",
      }}
    >
      <Group gap={4} style={{ position: "absolute", top: 18, right: 18 }}>
        {(["pt", "en", "es"] as const).map((code) => (
          <Button
            key={code}
            size="xs"
            variant={lang === code ? "white" : "subtle"}
            color="gray"
            onClick={() => setLang(code)}
          >
            {code.toUpperCase()}
          </Button>
        ))}
      </Group>

      <Card
        withBorder
        radius="lg"
        padding="xl"
        shadow="xl"
        style={{ width: "100%", maxWidth: 420 }}
      >
        <Stack align="center" gap="md" mb="lg">
          <Box
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "12px 18px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <img
              src={abbottLogo}
              alt="Abbott"
              style={{ maxWidth: 140, height: "auto", display: "block" }}
            />
          </Box>
          <Stack gap={2} align="center">
            <Title order={2} c="abbott.8">
              {t("appName")}
            </Title>
            <Text size="sm" c="dimmed" tt="uppercase" lts={2} fw={600}>
              {t("appTag")}
            </Text>
          </Stack>
        </Stack>

        <form onSubmit={submit}>
          <Stack gap="md">
            <TextInput
              label={t("loginUser")}
              placeholder="sambini"
              leftSection={<IconUser size={16} />}
              value={u}
              onChange={(e) => setU(e.currentTarget.value)}
              required
              autoFocus
            />
            <PasswordInput
              label={t("loginPassword")}
              placeholder="••••••••"
              leftSection={<IconLock size={16} />}
              value={p}
              onChange={(e) => setP(e.currentTarget.value)}
              required
            />

            {error && (
              <Alert color="red" icon={<IconAlertCircle size={16} />} radius="md">
                {t("loginInvalid")}
              </Alert>
            )}

            <Button type="submit" fullWidth size="md" loading={loading}>
              {t("loginSignIn")}
            </Button>
          </Stack>
        </form>

        <Center mt="lg">
          <Text size="xs" c="dimmed">
            {t("appDemoFooter")}
          </Text>
        </Center>

      </Card>
    </Box>
  );
}
