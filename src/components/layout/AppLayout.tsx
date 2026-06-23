import { useEffect, useState } from "react";
import { NavLink as RouterNavLink, Outlet, useLocation } from "react-router-dom";
import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Burger,
  Group,
  Indicator,
  Menu,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBell,
  IconChartBar,
  IconChecks,
  IconChevronDown,
  IconClockHour4,
  IconInbox,
  IconLayoutDashboard,
  IconLayoutKanban,
  IconListDetails,
  IconLogout,
  IconPlus,
  IconPresentation,
  IconSettings,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";
import { useAuth } from "../../auth/AuthContext";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { initialsFromName } from "../../lib/format";
import { useT, type Lang, type TKey } from "../../i18n";
import { demandService } from "../../data/demandService";
import { precisaDeMim } from "../../domain/workflow";
import { Role, ROLE_LABEL, ROLE_COLOR } from "../../domain/roles";
import abbottLogo from "../../assets/abbott-logo.png";
import classes from "./AppLayout.module.css";

interface NavItem {
  to: string;
  labelKey: TKey;
  icon: Icon;
  end?: boolean;
  badge?: number;
  /** Se definido, item só aparece para quem tem um desses papéis. */
  roles?: Role[];
}

function pageTitleKey(path: string): TKey {
  if (path === "/") return "nav_dashboard";
  if (path.startsWith("/demandas/nova")) return "newDemand";
  if (path.startsWith("/demandas")) return "nav_demandas";
  if (path.startsWith("/kanban")) return "nav_kanban";
  if (path.startsWith("/scoreboard")) return "nav_scoreboard";
  if (path.startsWith("/sponsors")) return "nav_sponsors";
  if (path.startsWith("/aprovacoes")) return "nav_aprovacoes";
  if (path.startsWith("/capacity")) return "nav_capacity";
  if (path.startsWith("/relatorio")) return "nav_admin";
  if (path.startsWith("/admin")) return "nav_admin";
  return "appName";
}

export function AppLayout() {
  const user = useCurrentUser();
  const loc = useLocation();
  const [opened, { toggle, close }] = useDisclosure();
  const { t } = useT();
  const { signOut, personas, switchPersona, user: session } = useAuth();
  const [pendentes, setPendentes] = useState(0);

  const roles = user.roles;

  // Conta demandas que aguardam UMA AÇÃO dos papéis do usuário atual.
  useEffect(() => {
    let cancelled = false;
    function refresh() {
      demandService
        .list()
        .then((items) => {
          if (cancelled) return;
          setPendentes(items.filter((d) => precisaDeMim(d, roles)).length);
        })
        .catch(() => {});
    }
    refresh();
    const id = window.setInterval(refresh, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [roles, loc.pathname]);

  const isAdmin = roles.includes(Role.Admin);

  const NAV_MAIN: NavItem[] = [
    { to: "/", labelKey: "nav_dashboard", icon: IconLayoutDashboard, end: true },
    { to: "/aprovacoes", labelKey: "nav_aprovacoes", icon: IconInbox, badge: pendentes },
    { to: "/demandas", labelKey: "nav_demandas", icon: IconListDetails },
    { to: "/kanban", labelKey: "nav_kanban", icon: IconLayoutKanban },
    { to: "/scoreboard", labelKey: "nav_scoreboard", icon: IconChartBar, roles: [Role.PMO, Role.Diretor, Role.Sponsor, Role.Admin] },
    { to: "/sponsors", labelKey: "nav_sponsors", icon: IconUsers, roles: [Role.Sponsor, Role.PMO, Role.Diretor, Role.Admin] },
    { to: "/capacity", labelKey: "nav_capacity", icon: IconClockHour4, roles: [Role.TechLead, Role.PMO, Role.Admin] },
  ];
  const navVisible = NAV_MAIN.filter((n) => !n.roles || n.roles.some((r) => roles.includes(r)));
  const canCreate = roles.includes(Role.Solicitante) || isAdmin;

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 268, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" gap="sm" wrap="nowrap" justify="space-between">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} size="lg" truncate>
              {t(pageTitleKey(loc.pathname))}
            </Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Indicator disabled={pendentes === 0} label={pendentes} size={16} color="red" offset={4}>
              <ActionIcon
                variant="default"
                size="lg"
                component="a"
                href="#/aprovacoes"
                aria-label="Bandeja de entrada"
              >
                <IconBell size={18} />
              </ActionIcon>
            </Indicator>

            {/* Switcher de persona — troca de papel sem deslogar (demo) */}
            <Menu position="bottom-end" width={300} shadow="md">
              <Menu.Target>
                <ActionIcon variant="default" size="lg" aria-label="Cambiar persona">
                  <IconChevronDown size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Entrar como (demo)</Menu.Label>
                {personas.map((p) => (
                  <Menu.Item
                    key={p.id}
                    onClick={() => switchPersona(p.id)}
                    leftSection={
                      <Avatar size={26} radius="xl" color="abbott.6" variant="filled">
                        {initialsFromName(p.nome)}
                      </Avatar>
                    }
                    rightSection={
                      session?.personaId === p.id ? <IconChecks size={15} color="green" /> : null
                    }
                  >
                    <Text size="sm" fw={session?.personaId === p.id ? 700 : 500}>
                      {p.nome}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {p.cargo}
                    </Text>
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar bg="abbott.9" withBorder={false}>
        <Stack gap={3} p="md" h="100%">
          <div className={classes.brand}>
            <div className={classes.logoBox}>
              <img src={abbottLogo} alt="Abbott" className={classes.logoImg} />
            </div>
            <div className={classes.brand1}>{t("appName")}</div>
            <div className={classes.brandSub}>{t("appTag")}</div>
          </div>

          {canCreate && (
            <RouterNavLink to="/demandas/nova" className={classes.cta} onClick={close}>
              <IconPlus size={17} stroke={2.5} />
              <span>{t("newDemand")}</span>
            </RouterNavLink>
          )}

          {navVisible.map((n) => (
            <RouterNavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={close}
              className={({ isActive }) =>
                isActive ? `${classes.navItem} ${classes.navItemActive}` : classes.navItem
              }
            >
              <n.icon size={19} stroke={1.7} />
              <span>{t(n.labelKey)}</span>
              {(n.badge ?? 0) > 0 && (
                <Badge size="sm" color="red" variant="filled" ml="auto">
                  {n.badge}
                </Badge>
              )}
            </RouterNavLink>
          ))}

          {isAdmin && (
            <>
              <div className={classes.navSection}>{t("nav_admin_section")}</div>
              <RouterNavLink
                to="/relatorio"
                onClick={close}
                className={({ isActive }) =>
                  isActive ? `${classes.navItem} ${classes.navItemActive}` : classes.navItem
                }
              >
                <IconPresentation size={19} stroke={1.7} />
                <span>Informe mensual</span>
              </RouterNavLink>
              <RouterNavLink
                to="/admin"
                onClick={close}
                className={({ isActive }) =>
                  isActive ? `${classes.navItem} ${classes.navItemActive}` : classes.navItem
                }
              >
                <IconSettings size={19} stroke={1.7} />
                <span>{t("nav_admin")}</span>
              </RouterNavLink>
            </>
          )}

          <div className={classes.userCard}>
            <Avatar src={user.photoUrl} radius="xl" size={40} color="abbott.4" variant="filled">
              {initialsFromName(user.name)}
            </Avatar>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text className={classes.userName} truncate>
                {user.name}
              </Text>
              <Group gap={3} wrap="nowrap">
                {roles.slice(0, 2).map((r) => (
                  <Badge key={r} size="xs" variant="light" color={ROLE_COLOR[r]}>
                    {ROLE_LABEL[r]}
                  </Badge>
                ))}
                {roles.length > 2 && (
                  <Badge size="xs" variant="light" color="gray">
                    +{roles.length - 2}
                  </Badge>
                )}
              </Group>
            </div>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              onClick={() => {
                signOut();
                window.location.hash = "#/login";
              }}
              title="Salir"
              aria-label="Salir"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <IconLogout size={16} />
            </ActionIcon>
          </div>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main bg="gray.0">
        <div className="page-fade" key={loc.pathname}>
          <Outlet />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}

// Avoid TS6133 — Lang only re-exported for callers
export type { Lang };
