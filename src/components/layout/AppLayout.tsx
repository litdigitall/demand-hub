import { useEffect, useState } from "react";
import { NavLink as RouterNavLink, Outlet, useLocation } from "react-router-dom";
import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Burger,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChartBar,
  IconClockHour4,
  IconExternalLink,
  IconInbox,
  IconListDetails,
  IconLogout,
  IconPlus,
  IconRoute,
  IconSettings,
  type Icon,
} from "@tabler/icons-react";
import { useAuth } from "../../auth/AuthContext";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { initialsFromName } from "../../lib/format";
import { useT, type Lang, type TKey } from "../../i18n";
import { demandService } from "../../data/demandService";
import { precisaDeMim } from "../../domain/workflow";
import { Role, ROLE_LABEL, ROLE_COLOR, papelPrincipal } from "../../domain/roles";
import { ErrorBoundary } from "../ErrorBoundary";
import abbottLogo from "../../assets/abbott-logo.png";
import classes from "./AppLayout.module.css";

interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  end?: boolean;
  badge?: number;
  roles?: Role[];
}

/* Onde o solicitante abre uma demanda. Quando o Canvas "IT Request Form"
   estiver publicado, basta setar VITE_INTAKE_FORM_URL no build: o CTA passa a
   apontar para ele. Sem a variável, usa o formulário interno — nunca fica sem
   porta de entrada. */
const INTAKE_URL = import.meta.env.VITE_INTAKE_FORM_URL as string | undefined;

function pageTitle(path: string): string {
  if (path === "/") return "Inbox";
  if (path.startsWith("/demandas/")) return "Request";
  if (path.startsWith("/demandas")) return "Requests";
  if (path.startsWith("/overview")) return "Overview";
  if (path.startsWith("/capacity")) return "Capacity";
  if (path.startsWith("/admin")) return "Settings";
  return "Intake Forms";
}

export function AppLayout() {
  const user = useCurrentUser();
  const loc = useLocation();
  const [opened, { toggle, close }] = useDisclosure();
  useT();
  const { signOut } = useAuth();
  const [pendentes, setPendentes] = useState(0);
  const roles = user.roles;

  useEffect(() => {
    let cancelled = false;
    function refresh() {
      demandService
        .list()
        .then((items) => {
          if (cancelled) return;
          setPendentes(items.filter((d) => precisaDeMim(d, roles, user.decisorDe)).length);
        })
        .catch(() => {});
    }
    refresh();
    const id = window.setInterval(refresh, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [roles, user.decisorDe, loc.pathname]);

  /* Menu plano: 5 destinos. Cada um é um lugar diferente de verdade —
     as antigas Board/Score Board/Approvers Status viraram visões de Requests. */
  const NAV: NavItem[] = [
    { to: "/", label: "Inbox", icon: IconInbox, end: true, badge: pendentes },
    { to: "/demandas", label: "Requests", icon: IconListDetails },
    { to: "/overview", label: "Overview", icon: IconChartBar, roles: [Role.PMO, Role.Decisor, Role.Admin] },
    { to: "/capacity", label: "Capacity", icon: IconClockHour4, roles: [Role.TechLead, Role.PMO, Role.Admin] },
    { to: "/admin", label: "Settings", icon: IconSettings, roles: [Role.Admin] },
  ];
  const nav = NAV.filter((n) => !n.roles || n.roles.some((r) => roles.includes(r)));

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${classes.navItem} ${classes.navItemActive}` : classes.navItem;

  return (
    <AppShell
      header={{ height: 62 }}
      navbar={{ width: 248, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header
        withBorder={false}
        style={{
          background: "var(--mantine-color-body)",
          borderBottom: "1px solid var(--mantine-color-gray-2)",
        }}
      >
        <Group h="100%" px="lg" gap="sm" wrap="nowrap" justify="space-between">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={800} size="lg" truncate>{pageTitle(loc.pathname)}</Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            {/* Fluxograma do processo: consulta ocasional, não item de menu. */}
            <Tooltip label="Process flow" withArrow>
              <ActionIcon
                variant="default"
                size="lg"
                component="a"
                href="flow/index.html"
                target="_blank"
                rel="noreferrer"
                aria-label="Process flow"
              >
                <IconRoute size={18} />
              </ActionIcon>
            </Tooltip>
            <Group gap={8} wrap="nowrap" visibleFrom="sm">
              <Avatar radius="xl" size={34} variant="gradient" gradient={{ from: "abbott.6", to: "grape.6", deg: 60 }}>
                {initialsFromName(user.name)}
              </Avatar>
              <div style={{ minWidth: 0 }}>
                <Text size="sm" fw={600} truncate style={{ maxWidth: 160 }}>{user.name}</Text>
                <Text size="xs" c="dimmed" truncate style={{ maxWidth: 160 }}>{user.cargo}</Text>
              </div>
            </Group>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        withBorder={false}
        style={{
          background:
            "linear-gradient(180deg, var(--mantine-color-abbott-9) 0%, var(--mantine-color-abbott-8) 55%, #3a1d6e 130%)",
        }}
      >
        <Stack gap={3} p="md" h="100%">
          <div className={classes.brand}>
            <div className={classes.logoBox}>
              <img src={abbottLogo} alt="Abbott" className={classes.logoImg} />
            </div>
            <div className={classes.brand1}>Intake Forms</div>
            <div className={classes.brandSub}>by LIT Digitall</div>
          </div>

          {/* Abrir demanda: o formulário mora fora do app de gestão. */}
          {INTAKE_URL ? (
            <a href={INTAKE_URL} target="_blank" rel="noreferrer" className={classes.cta}>
              <IconPlus size={17} stroke={2.5} />
              <span>New request</span>
              <IconExternalLink size={14} style={{ opacity: 0.7 }} />
            </a>
          ) : (
            <RouterNavLink to="/solicitar" className={classes.cta} onClick={close}>
              <IconPlus size={17} stroke={2.5} />
              <span>New request</span>
            </RouterNavLink>
          )}

          {nav.map((n) => (
            <RouterNavLink key={n.to} to={n.to} end={n.end} onClick={close} className={navClass}>
              <n.icon size={19} stroke={1.7} />
              <span>{n.label}</span>
              {(n.badge ?? 0) > 0 && (
                <Badge size="sm" color="grape" variant="filled" ml="auto">{n.badge}</Badge>
              )}
            </RouterNavLink>
          ))}

          <div className={classes.userCard}>
            <Avatar radius="xl" size={40} variant="gradient" gradient={{ from: "abbott.4", to: "grape.5", deg: 60 }}>
              {initialsFromName(user.name)}
            </Avatar>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text className={classes.userName} truncate>{user.name}</Text>
              <Badge size="xs" variant="light" color={ROLE_COLOR[papelPrincipal(roles)]}>
                {ROLE_LABEL[papelPrincipal(roles)]}
              </Badge>
            </div>
            <ActionIcon
              variant="subtle"
              size="md"
              onClick={() => { signOut(); window.location.hash = "#/login"; }}
              title="Sign out"
              aria-label="Sign out"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <IconLogout size={16} />
            </ActionIcon>
          </div>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <div className="page-fade" key={loc.pathname}>
          <ErrorBoundary key={loc.pathname}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </AppShell.Main>
    </AppShell>
  );
}

export type { Lang, TKey };
