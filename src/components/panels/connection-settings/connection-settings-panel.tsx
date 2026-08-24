import { Alert, Button, Flex, Input, Select, Space } from 'antd';
import { CloudServerOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import { JSX, useEffect, useState } from 'react';
import { ConnectionProfile } from '@/models/connection-profile';
import { ConnectionSettings } from '@/models/connection-settings';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { TextInput } from '@/components/controls/text-input/text-input';
import { Toggle } from '@/components/controls/toggle/toggle';
import { Utils } from '@/utils/utils';
import axios from 'axios';
import localforage from 'localforage';

const PROFILES_KEY = 'forgesteel-connection-profiles';

interface Props {
	connectionSettings: ConnectionSettings;
	setConnectionSettings: (settings: ConnectionSettings) => void;
}

export const ConnectionSettingsPanel = (props: Props) => {
	const [ connectionSettings, setConnectionSettings ] = useState<ConnectionSettings>(Utils.copy(props.connectionSettings));
	const [ connectionSettingsChanged, setConnectionSettingsChanged ] = useState<boolean>(false);
	const [ testingWarehouseConnection, setTestingWarehouseConnection ] = useState<boolean>(false);
	const [ testStatusAlert, setTestStatusAlert ] = useState<JSX.Element | null>(null);

	const [ hostInputStatus, setHostInputStatus ] = useState<'error' | undefined>(undefined);
	const [ tokenInputStatus, setTokenInputStatus ] = useState<'error' | undefined>(undefined);

	const [ connectedAs, setConnectedAs ] = useState<string | null>(null);
	const [ profiles, setProfiles ] = useState<ConnectionProfile[]>([]);
	const [ profileStatusAlert, setProfileStatusAlert ] = useState<JSX.Element | null>(null);

	useEffect(() => {
		localforage.getItem<ConnectionProfile[]>(PROFILES_KEY).then(stored => {
			setProfiles(stored ?? []);
		});
	}, []);

	const fetchConnectedAs = (host: string, token: string) => {
		axios.get(`${host}/healthz`)
			.then(response => {
				const version = response.data.version;
				const maj = parseInt(version.split('.')[0]);
				const method = maj > 0 ? 'post' : 'get';
				return axios.request({
					url: `${host}/connect`,
					method: method,
					headers: { Authorization: `Bearer ${token}` },
					withCredentials: true,
					withXSRFToken: true
				});
			})
			.then(connectResponse => axios.get(`${host}/me`, {
				headers: { Authorization: `Bearer ${connectResponse.data.access_token}` }
			}))
			.then(response => setConnectedAs(response.data.logged_in_as))
			.catch(() => setConnectedAs(null));
	};

	useEffect(() => {
		// Only check the connection that was already saved when this panel first mounts -
		// setWarehouseUrl/setWarehouseToken/testConnection already handle it on every later change.
		if (connectionSettings.useManualWarehouse && connectionSettings.warehouseHost && connectionSettings.warehouseToken) {
			fetchConnectedAs(connectionSettings.warehouseHost, connectionSettings.warehouseToken);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const persistProfiles = (value: ConnectionProfile[]) => {
		setProfiles(value);
		return localforage.setItem<ConnectionProfile[]>(PROFILES_KEY, value);
	};

	const setUseManualWarehouse = (value: boolean) => {
		const copy = Utils.copy(connectionSettings);
		copy.useManualWarehouse = value;
		setConnectionSettings(copy);
		setConnectionSettingsChanged(true);
	};

	const setWarehouseUrl = (value: string) => {
		setHostInputStatus(undefined);
		setConnectedAs(null);
		const copy = Utils.copy(connectionSettings);
		copy.warehouseHost = value;
		setConnectionSettings(copy);
		setConnectionSettingsChanged(true);
	};

	const setWarehouseToken = (value: string) => {
		setTokenInputStatus(undefined);
		setConnectedAs(null);
		const copy = Utils.copy(connectionSettings);
		copy.warehouseToken = value;
		setConnectionSettings(copy);
		setConnectionSettingsChanged(true);
	};

	const normalizeSettings = () => {
		const copy = Utils.copy(connectionSettings);
		copy.warehouseHost = Utils.fixHostnameUrl(connectionSettings.warehouseHost);
		setConnectionSettings(copy);
		return copy;
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const showTestConnectionError = (err: any) => {
		console.error('Error connecting to Warehouse', err);
		if (err.response) {
			const code = err.response.status;
			const msg = err.response.data.message ?? err.response.data;
			setTestStatusAlert(<Alert title={`${code} Error: ${msg}`} type='error' showIcon closable />);
		} else {
			setTestStatusAlert(<Alert title={`Unable to connect to warehouse: ${err.message}`} type='error' showIcon closable />);
		}
	};

	const testWarehouseConnection = () => {
		const settings = normalizeSettings();
		setHostInputStatus(undefined);
		setTokenInputStatus(undefined);
		setConnectedAs(null);
		setTestingWarehouseConnection(true);
		axios.defaults.xsrfCookieName = 'csrf_access_token';
		axios.defaults.xsrfHeaderName = 'X-CSRF-TOKEN';
		const healthUrl = `${settings.warehouseHost}/healthz`;
		const connectUrl = `${settings.warehouseHost}/connect`;
		axios.get(healthUrl)
			.then(response => {
				const version = response.data.version;
				const maj = parseInt(version.split('.')[0]);
				const method = maj > 0 ? 'post' : 'get';
				axios.request({
					url: connectUrl,
					method: method,
					headers: { Authorization: `Bearer ${settings.warehouseToken}` },
					withCredentials: true,
					withXSRFToken: true
				}).then(connectResponse => {
					setTestStatusAlert(<Alert title={`Success! (v${version})`} type='success' showIcon closable />);
					axios.get(`${settings.warehouseHost}/me`, {
						headers: { Authorization: `Bearer ${connectResponse.data.access_token}` }
					}).then(response => {
						setConnectedAs(response.data.logged_in_as);
					}).catch(reason => {
						console.error('Error fetching current Warehouse user', reason);
						setConnectedAs(null);
					});
				}).catch(reason => {
					setTokenInputStatus('error');
					showTestConnectionError(reason);
				});
			}).catch(reason => {
				setHostInputStatus('error');
				showTestConnectionError(reason);
			}).finally(() => {
				setTestingWarehouseConnection(false);
				setTimeout(() => {
					setTestStatusAlert(null);
				}, 10000);
			});
	};

	const saveWarehouseSettings = () => {
		normalizeSettings();
		props.setConnectionSettings(connectionSettings);
		setConnectionSettingsChanged(false);
	};

	const saveAsProfile = () => {
		if (!connectedAs) {
			return;
		}

		const existing = profiles.find(p => p.token === connectionSettings.warehouseToken);
		const profile: ConnectionProfile = {
			id: existing ? existing.id : Utils.guid(),
			name: connectedAs,
			host: connectionSettings.warehouseHost,
			token: connectionSettings.warehouseToken
		};
		const updated = existing
			? profiles.map(p => (p.id === existing.id ? profile : p))
			: [ ...profiles, profile ];

		persistProfiles(updated);
		setProfileStatusAlert(<Alert title={`Saved campaign "${profile.name}"`} type='success' showIcon closable />);
		setTimeout(() => {
			setProfileStatusAlert(null);
		}, 5000);
	};

	const switchProfile = (profileId: string) => {
		const profile = profiles.find(p => p.id === profileId);
		if (!profile) {
			return;
		}

		setHostInputStatus(undefined);
		setTokenInputStatus(undefined);
		setConnectedAs(null);
		const copy = Utils.copy(connectionSettings);
		copy.warehouseHost = profile.host;
		copy.warehouseToken = profile.token;
		setConnectionSettings(copy);
		setConnectionSettingsChanged(true);
	};

	const deleteProfile = (profileId: string) => {
		persistProfiles(profiles.filter(p => p.id !== profileId));
	};

	return (
		<Space orientation='vertical' style={{ width: '100%' }}>
			{
				connectionSettings.usePatreonWarehouse &&
					<Alert
						type='warning'
						title="You are a patron with automatic access to the Patron Warehouse - you don't need to manually connect to anything!"
						showIcon={true}
					/>
			}
			<Toggle
				label='Manually connect with Forge Steel Warehouse'
				value={connectionSettings.useManualWarehouse}
				onChange={setUseManualWarehouse}
			/>
			{
				connectionSettings.useManualWarehouse ?
					<>
						{
							connectedAs ?
								<Alert
									type='info'
									title={<span><UserOutlined /> Connected to <strong>{connectedAs}</strong></span>}
									showIcon={false}
								/>
								: null
						}
						<HeaderText>Warehouse Host</HeaderText>
						<TextInput
							placeholder='Warehouse Host'
							allowClear={true}
							status={hostInputStatus}
							value={connectionSettings.warehouseHost}
							onChange={setWarehouseUrl}
						/>
						<HeaderText>API Token</HeaderText>
						<Input.Password
							placeholder='Warehouse API Token'
							status={tokenInputStatus}
							value={connectionSettings.warehouseToken}
							onChange={e => setWarehouseToken(e.target.value)}
						/>
					</>
					: null
			}
			<Flex gap='small' justify='flex-end' wrap>
				{
					connectionSettings.useManualWarehouse ?
						<Button
							variant='solid'
							loading={testingWarehouseConnection}
							icon={<CloudServerOutlined />}
							onClick={testWarehouseConnection}
						>
							Connect
						</Button>
						: null
				}
				{
					connectionSettings.useManualWarehouse ?
						<Button
							variant='solid'
							icon={<SaveOutlined />}
							disabled={!connectedAs}
							onClick={saveAsProfile}
						>
							Save as Campaign
						</Button>
						: null
				}
				<Button
					color='primary'
					variant='solid'
					icon={<SaveOutlined />}
					onClick={saveWarehouseSettings}
					disabled={!connectionSettingsChanged}
				>
					Save
				</Button>
			</Flex>
			{testStatusAlert}
			{profileStatusAlert}
			{
				(connectionSettings.useManualWarehouse && profiles.length > 0) ?
					<>
						<HeaderText>Switch Campaign</HeaderText>
						<Select
							style={{ width: '100%' }}
							placeholder='Select a saved campaign'
							value={undefined}
							options={profiles.map(p => ({ value: p.id, label: p.name }))}
							onChange={switchProfile}
						/>
						<HeaderText>Manage Saved Campaigns</HeaderText>
						<Space orientation='vertical' style={{ width: '100%' }}>
							{
								profiles.map(profile => (
									<Flex key={profile.id} gap='small' align='center' justify='space-between'>
										<span>{profile.name}</span>
										<DangerButton
											mode='icon'
											label='Delete campaign'
											message={<div className='ds-text'>Remove the saved campaign "{profile.name}"?</div>}
											onConfirm={() => deleteProfile(profile.id)}
										/>
									</Flex>
								))
							}
						</Space>
					</>
					: null
			}
		</Space>
	);
};
