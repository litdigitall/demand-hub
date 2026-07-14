import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconArrowRight, IconLock, IconMail, IconSparkles } from "@tabler/icons-react";
import { useAuth, DEMO_PASSWORD } from "../auth/AuthContext";
import { ROLE_LABEL, ROLE_COLOR } from "../domain/roles";
import { initialsFromName } from "../lib/format";
import abbottLogo from "../assets/abbott-logo.png";

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, user, personas } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    setTimeout(() => {
      const ok = signIn(email, password);
      setLoading(false);
      if (ok) navigate("/", { replace: true });
      else setError(true);
    }, 350);
  }

  return (
    <Box style={{ minHeight: "100vh", display: "flex" }}>
      {/* Hero vibrante à esquerda */}
      <Box
        visibleFrom="md"
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, var(--mantine-color-abbott-8) 0%, var(--mantine-color-abbott-6) 45%, var(--mantine-color-grape-6) 120%)",
          color: "#fff",
          padding: "3rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Box style={{ position: "absolute", inset: 0, opacity: 0.18,
          background: "radial-gradient(600px 300px at 80% 10%, #fff, transparent 60%), radial-gradient(500px 260px at 10% 90%, #fff, transparent 55%)" }} />
        <Box style={{ position: "relative", zIndex: 1 }}>
          <Box style={{ background: "#fff", borderRadius: 12, padding: "8px 14px", width: "fit-content" }}>
            <img src={abbottLogo} alt="Abbott" style={{ maxWidth: 120, display: "block" }} />
          </Box>
        </Box>
        <Box style={{ position: "relative", zIndex: 1, maxWidth: 460 }}>
          <Badge size="lg" variant="white" c="abbott.7" leftSection={<IconSparkles size={14} />} mb="md">
            Demand Hub
          </Badge>
          <Title order={1} style={{ fontSize: "2.6rem", lineHeight: 1.1 }}>
            Intake, score &amp; approve IT demand — in one flow.
          </Title>
          <Text mt="md" size="lg" style={{ opacity: 0.9 }}>
            Free entry for everyone, automatic scoring, a clear DMC approval flow and
            capacity vs. score prioritization.
          </Text>
        </Box>
        <Text size="sm" style={{ position: "relative", zIndex: 1, opacity: 0.8 }}>
          LIT Digitall · Confidential
        </Text>
      </Box>

      {/* Painel de login à direita */}
      <Box style={{ width: "100%", maxWidth: 480, margin: "0 auto", padding: "2.5rem 2rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Stack gap="xs" mb="lg">
          <Title order={2}>Sign in</Title>
          <Text c="dimmed" size="sm">
            Use your work account. Your role determines what you see.
          </Text>
        </Stack>

        <form onSubmit={submit}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="name@abbott.com"
              leftSection={<IconMail size={16} />}
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              error={error ? "Invalid credentials" : undefined}
              required
              autoFocus
            />
            <PasswordInput
              label="Password"
              leftSection={<IconLock size={16} />}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
            />
            <Button type="submit" size="md" fullWidth loading={loading} variant="gradient"
              gradient={{ from: "abbott.7", to: "grape.6", deg: 60 }}>
              Sign in
            </Button>
          </Stack>
        </form>

        {/* Contas demo (um clique = login por papel) */}
        <Text size="xs" c="dimmed" mt="xl" mb="xs" tt="uppercase" fw={700} lts={1}>
          Demo accounts (one click)
        </Text>
        <Stack gap={6}>
          {personas.map((p) => (
            <UnstyledButton
              key={p.id}
              onClick={() => { setEmail(p.email); setPassword(DEMO_PASSWORD); signIn(p.email, DEMO_PASSWORD) && navigate("/", { replace: true }); }}
              className="hover-lift"
              style={{ border: "1px solid var(--mantine-color-gray-2)", borderRadius: 12, padding: "8px 12px" }}
            >
              <Group gap="sm" wrap="nowrap">
                <Avatar radius="xl" size={34} variant="gradient" gradient={{ from: "abbott.6", to: "grape.6", deg: 60 }}>
                  {initialsFromName(p.nome)}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={600} truncate>{p.nome}</Text>
                  <Text size="xs" c="dimmed" truncate>{p.email}</Text>
                </div>
                <Group gap={4}>
                  {p.roles.slice(0, 1).map((r) => (
                    <Badge key={r} size="xs" variant="light" color={ROLE_COLOR[r]}>{ROLE_LABEL[r]}</Badge>
                  ))}
                  {p.roles.length > 1 && <Badge size="xs" variant="light" color="gray">+{p.roles.length - 1}</Badge>}
                </Group>
                <IconArrowRight size={15} color="var(--mantine-color-gray-5)" />
              </Group>
            </UnstyledButton>
          ))}
        </Stack>

        <Center mt="lg">
          <Text size="sm">
            Just want to submit a request?{" "}
            <Anchor component={Link} to="/solicitar" fw={600}>Public form →</Anchor>
          </Text>
        </Center>
      </Box>
    </Box>
  );
}
