// AudioSwitch – lists / sets the Windows default playback device (all roles).
// Compiled by the Aurelune installer with the built-in .NET Framework compiler (C# 5).
using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential)]
struct PROPERTYKEY { public Guid fmtid; public int pid; }

[StructLayout(LayoutKind.Explicit)]
struct PROPVARIANT {
    [FieldOffset(0)] public short vt;
    [FieldOffset(8)] public IntPtr pointerValue;
    [FieldOffset(16)] public IntPtr pad;
}

[ComImport, Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPropertyStore {
    [PreserveSig] int GetCount(out int count);
    [PreserveSig] int GetAt(int index, out PROPERTYKEY key);
    [PreserveSig] int GetValue(ref PROPERTYKEY key, out PROPVARIANT value);
}

[ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    [PreserveSig] int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
    [PreserveSig] int OpenPropertyStore(int stgmAccess, out IPropertyStore properties);
    [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
    [PreserveSig] int GetState(out int state);
}

[ComImport, Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceCollection {
    [PreserveSig] int GetCount(out int count);
    [PreserveSig] int Item(int index, out IMMDevice device);
}

[ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    [PreserveSig] int EnumAudioEndpoints(int dataFlow, int stateMask, out IMMDeviceCollection devices);
    [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumerator { }

[ComImport, Guid("f8679f50-850a-41cf-9c72-430f290290c8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPolicyConfig {
    [PreserveSig] int GetMixFormat([MarshalAs(UnmanagedType.LPWStr)] string id, IntPtr format);
    [PreserveSig] int GetDeviceFormat([MarshalAs(UnmanagedType.LPWStr)] string id, int def, out IntPtr format);
    [PreserveSig] int ResetDeviceFormat([MarshalAs(UnmanagedType.LPWStr)] string id);
    [PreserveSig] int SetDeviceFormat([MarshalAs(UnmanagedType.LPWStr)] string id, IntPtr endpointFormat, IntPtr mixFormat);
    [PreserveSig] int GetProcessingPeriod([MarshalAs(UnmanagedType.LPWStr)] string id, int def, IntPtr defPeriod, IntPtr minPeriod);
    [PreserveSig] int SetProcessingPeriod([MarshalAs(UnmanagedType.LPWStr)] string id, IntPtr period);
    [PreserveSig] int GetShareMode([MarshalAs(UnmanagedType.LPWStr)] string id, IntPtr mode);
    [PreserveSig] int SetShareMode([MarshalAs(UnmanagedType.LPWStr)] string id, IntPtr mode);
    [PreserveSig] int GetPropertyValue([MarshalAs(UnmanagedType.LPWStr)] string id, IntPtr key, IntPtr value);
    [PreserveSig] int SetPropertyValue([MarshalAs(UnmanagedType.LPWStr)] string id, IntPtr key, IntPtr value);
    [PreserveSig] int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string id, int role);
    [PreserveSig] int SetEndpointVisibility([MarshalAs(UnmanagedType.LPWStr)] string id, int visible);
}

[ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    [PreserveSig] int RegisterControlChangeNotify(IntPtr notify);
    [PreserveSig] int UnregisterControlChangeNotify(IntPtr notify);
    [PreserveSig] int GetChannelCount(out int count);
    [PreserveSig] int SetMasterVolumeLevel(float levelDB, IntPtr ctx);
    [PreserveSig] int SetMasterVolumeLevelScalar(float level, IntPtr ctx);
    [PreserveSig] int GetMasterVolumeLevel(out float levelDB);
    [PreserveSig] int GetMasterVolumeLevelScalar(out float level);
    [PreserveSig] int SetChannelVolumeLevel(int channel, float levelDB, IntPtr ctx);
    [PreserveSig] int SetChannelVolumeLevelScalar(int channel, float level, IntPtr ctx);
    [PreserveSig] int GetChannelVolumeLevel(int channel, out float levelDB);
    [PreserveSig] int GetChannelVolumeLevelScalar(int channel, out float level);
    [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, IntPtr ctx);
    [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
}

[ComImport, Guid("870af99c-171d-4f9e-af0d-e63df40c2bc9")]
class PolicyConfigClient { }

class Dev { public string Id; public string Name; public bool IsDefault; public IMMDevice Device; public int Flow; public int State; }

static class Program {
    // Only the VB-Audio cable counts as "virtual" – SteelSeries Sonar, Nahimic, Voicemeeter etc. are valid main outputs.
    static bool IsVirtual(string name) {
        string n = name.ToLowerInvariant();
        return n.Contains("cable") && (n.Contains("vb-audio") || n.StartsWith("cable"));
    }

    static List<Dev> List() { return List(0); }

    static List<Dev> List(int flow) { return List(flow, 1); }

    static List<Dev> List(int flow, int mask) {
        var result = new List<Dev>();
        var en = (IMMDeviceEnumerator)new MMDeviceEnumerator();
        string defId = null;
        IMMDevice def;
        if (en.GetDefaultAudioEndpoint(flow, 1, out def) == 0 && def != null) def.GetId(out defId);
        IMMDeviceCollection col;
        if (en.EnumAudioEndpoints(flow, mask, out col) != 0) return result;
        int count; col.GetCount(out count);
        var key = new PROPERTYKEY { fmtid = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"), pid = 14 };
        for (int i = 0; i < count; i++) {
            IMMDevice d; col.Item(i, out d);
            string id; d.GetId(out id);
            int state; d.GetState(out state);
            string name = id;
            try {
                IPropertyStore ps;
                if (d.OpenPropertyStore(0, out ps) == 0 && ps != null) {
                    PROPVARIANT pv;
                    if (ps.GetValue(ref key, out pv) == 0 && pv.pointerValue != IntPtr.Zero) name = Marshal.PtrToStringUni(pv.pointerValue);
                }
            } catch { }
            result.Add(new Dev { Id = id, Name = name, IsDefault = id == defId, Device = d, Flow = flow, State = state });
        }
        return result;
    }

    static int Set(string id) {
        var pc = (IPolicyConfig)new PolicyConfigClient();
        int hr = 0;
        for (int role = 0; role < 3; role++) { int r = pc.SetDefaultEndpoint(id, role); if (r != 0) hr = r; }
        return hr;
    }

    static Dev Find(List<Dev> list, string query) {
        foreach (Dev d in list) if (d.Id == query) return d;
        foreach (Dev d in list) if (string.Equals(d.Name, query, StringComparison.OrdinalIgnoreCase)) return d;
        foreach (Dev d in list) if (d.Name.IndexOf(query, StringComparison.OrdinalIgnoreCase) >= 0) return d;
        return null;
    }

    static readonly Guid PCM = new Guid("00000001-0000-0010-8000-00aa00389b71");
    static readonly Guid FLOAT = new Guid("00000003-0000-0010-8000-00aa00389b71");

    static IntPtr MakeFormat(int rate, int bits, Guid sub) {
        IntPtr p = Marshal.AllocHGlobal(40);
        int align = 2 * bits / 8;
        Marshal.WriteInt16(p, 0, unchecked((short)0xFFFE));
        Marshal.WriteInt16(p, 2, 2);
        Marshal.WriteInt32(p, 4, rate);
        Marshal.WriteInt32(p, 8, rate * align);
        Marshal.WriteInt16(p, 12, (short)align);
        Marshal.WriteInt16(p, 14, (short)bits);
        Marshal.WriteInt16(p, 16, 22);
        Marshal.WriteInt16(p, 18, (short)bits);
        Marshal.WriteInt32(p, 20, 3);
        byte[] g = sub.ToByteArray();
        Marshal.Copy(g, 0, IntPtr.Add(p, 24), 16);
        return p;
    }

    static List<Dev> Cables() {
        var r = new List<Dev>();
        for (int flow = 0; flow < 2; flow++)
            foreach (Dev d in List(flow))
                if (IsVirtual(d.Name)) r.Add(d);
        return r;
    }

    static int Main(string[] args) {
        Console.OutputEncoding = new UTF8Encoding(false);
        try {
            string cmd = args.Length > 0 ? args[0].ToLowerInvariant() : "list";
            var list = List();
            if (cmd == "list") {
                foreach (Dev d in list) Console.WriteLine(d.Id + "\t" + d.Name + "\t" + (d.IsDefault ? "1" : "0"));
                return 0;
            }
            if (cmd == "devices") {
                // all endpoints in all states: flow, state(1 active,2 disabled,4 not present,8 unplugged), default, cable, id, name
                for (int flow = 0; flow < 2; flow++)
                    foreach (Dev d in List(flow, 15))
                        Console.WriteLine((flow == 0 ? "render" : "capture") + "\t" + d.State + "\t" + (d.IsDefault ? "1" : "0") + "\t" + (IsVirtual(d.Name) ? "1" : "0") + "\t" + d.Id + "\t" + d.Name);
                return 0;
            }
            if (cmd == "enable" && args.Length > 1) {
                var pc = (IPolicyConfig)new PolicyConfigClient();
                int hr = pc.SetEndpointVisibility(args[1], 1);
                Console.WriteLine(hr == 0 ? "ok" : "fail 0x" + hr.ToString("X8"));
                return hr == 0 ? 0 : 6;
            }
            if (cmd == "enable-cable") {
                var pc = (IPolicyConfig)new PolicyConfigClient();
                int fails = 0;
                for (int flow = 0; flow < 2; flow++)
                    foreach (Dev d in List(flow, 15))
                        if (IsVirtual(d.Name) && d.State == 2) {
                            int hr = pc.SetEndpointVisibility(d.Id, 1);
                            Console.WriteLine((hr == 0 ? "enabled\t" : "fail\t") + d.Name);
                            if (hr != 0) fails++;
                        }
                return fails == 0 ? 0 : 6;
            }
            if (cmd == "cable-status") {
                var pc = (IPolicyConfig)new PolicyConfigClient();
                foreach (Dev d in Cables()) {
                    IntPtr f; int rate = 0, bits = 0;
                    if (pc.GetDeviceFormat(d.Id, 0, out f) == 0 && f != IntPtr.Zero) { rate = Marshal.ReadInt32(f, 4); bits = Marshal.ReadInt16(f, 14); Marshal.FreeCoTaskMem(f); }
                    Console.WriteLine((d.Flow == 0 ? "render" : "capture") + "\t" + d.Name + "\t" + rate + "\t" + bits);
                }
                return 0;
            }
            if (cmd == "cable-format") {
                int rate = args.Length > 1 ? int.Parse(args[1]) : 48000;
                var pc = (IPolicyConfig)new PolicyConfigClient();
                int fails = 0;
                foreach (Dev d in Cables()) {
                    IntPtr mix = MakeFormat(rate, 32, FLOAT);
                    int hr = -1;
                    foreach (int b in new int[] { 24, 16 }) {
                        IntPtr ep = MakeFormat(rate, b, PCM);
                        hr = pc.SetDeviceFormat(d.Id, ep, mix);
                        Marshal.FreeHGlobal(ep);
                        if (hr == 0) { Console.WriteLine("ok\t" + d.Name + "\t" + rate + "\t" + b); break; }
                    }
                    Marshal.FreeHGlobal(mix);
                    if (hr != 0) { fails++; Console.WriteLine("fail\t" + d.Name + "\t0x" + hr.ToString("X8")); }
                }
                return fails == 0 ? 0 : 5;
            }
            if (cmd == "cable-volume") {
                Guid iid = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");
                foreach (Dev d in Cables()) {
                    object o;
                    if (d.Device.Activate(ref iid, 23, IntPtr.Zero, out o) == 0) {
                        var v = (IAudioEndpointVolume)o;
                        v.SetMasterVolumeLevelScalar(1.0f, IntPtr.Zero);
                        v.SetMute(false, IntPtr.Zero);
                        Console.WriteLine("ok\t" + d.Name);
                    }
                }
                return 0;
            }
            if (cmd == "set" && args.Length > 1) {
                Dev d = Find(list, args[1]);
                if (d == null) { Console.Error.WriteLine("not found"); return 2; }
                return Set(d.Id) == 0 ? 0 : 3;
            }
            if (cmd == "restore") {
                // preferred device saved by Aurelune, else first real (non-virtual) device
                string saved = null;
                string file = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".aurelune", "real_device.txt");
                if (File.Exists(file)) saved = File.ReadAllText(file, Encoding.UTF8).Trim();
                Dev target = saved != null ? Find(list, saved) : null;
                if (target == null) foreach (Dev d in list) if (!IsVirtual(d.Name)) { target = d; break; }
                if (target == null) return 2;
                Console.WriteLine(target.Name);
                return Set(target.Id) == 0 ? 0 : 3;
            }
            Console.Error.WriteLine("usage: AudioSwitch list | devices | set <id|name> | restore | enable <id> | enable-cable | cable-status | cable-format [rate] | cable-volume");
            return 1;
        } catch (Exception e) {
            Console.Error.WriteLine(e.Message);
            return 4;
        }
    }
}
