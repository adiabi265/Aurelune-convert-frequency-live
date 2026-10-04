// Aurelune Studio - Online-Setup (v3.13)
// Kleine Starter-EXE: laedt immer die NEUESTE Version von GitHub (main), entpackt sie in %TEMP%
// und startet den normalen Installer (installer\setup.ps1). Dadurch muss die EXE nie neu gebaut werden.
// Bauen (Windows, ohne Visual Studio):
//   %WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe /nologo /optimize+ /target:winexe
//     /out:Aurelune-Studio-Setup.exe /win32icon:Setup-Dateien\app\aurelune.ico
//     /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll Setup-Dateien\installer\SetupStub.cs
using System;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Threading;
using System.Windows.Forms;

static class AureluneSetup
{
    const string Repo = "adiabi265/Aurelune-convert-frequency-live";
    const string Branch = "main";
    static bool De = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName == "de";
    static string M(string en, string de) { return De ? de : en; }

    [STAThread]
    static void Main()
    {
        Application.EnableVisualStyles();
        try { ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; } catch { }

        Form f = new Form();
        f.Text = "Aurelune Studio Setup";
        f.FormBorderStyle = FormBorderStyle.FixedDialog;
        f.MaximizeBox = false; f.MinimizeBox = false;
        f.StartPosition = FormStartPosition.CenterScreen;
        f.ClientSize = new Size(440, 130);
        f.BackColor = Color.FromArgb(14, 12, 22);
        try { f.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
        Label title = new Label();
        title.Text = "Aurelune Studio";
        title.ForeColor = Color.FromArgb(245, 185, 113);
        title.Font = new Font("Segoe UI", 14f, FontStyle.Bold);
        title.SetBounds(20, 14, 400, 30);
        Label st = new Label();
        st.Text = M("Downloading the latest version …", "Lade die neueste Version …");
        st.ForeColor = Color.FromArgb(200, 192, 220);
        st.Font = new Font("Segoe UI", 10f);
        st.SetBounds(20, 50, 400, 24);
        ProgressBar pb = new ProgressBar();
        pb.SetBounds(20, 84, 400, 16);
        pb.Style = ProgressBarStyle.Marquee;
        f.Controls.Add(title); f.Controls.Add(st); f.Controls.Add(pb);

        string err = null;
        bool done = false;
        f.Shown += delegate
        {
            Thread t = new Thread(delegate ()
            {
                try { Run(f, st); }
                catch (Exception ex) { err = ex.Message; }
                done = true;
                try { f.BeginInvoke((MethodInvoker)delegate { f.Close(); }); } catch { }
            });
            t.IsBackground = true;
            t.Start();
        };
        f.FormClosing += delegate (object s, FormClosingEventArgs e) { if (!done) e.Cancel = true; };
        Application.Run(f);
        if (err != null)
            MessageBox.Show(M("The setup could not be downloaded. Please check your internet connection and try again.\n\n",
                              "Das Setup konnte nicht geladen werden. Bitte Internetverbindung prüfen und nochmal starten.\n\n") + err,
                            "Aurelune Studio", MessageBoxButtons.OK, MessageBoxIcon.Warning);
    }

    static void Say(Form f, Label st, string text)
    {
        try { f.BeginInvoke((MethodInvoker)delegate { st.Text = text; }); } catch { }
    }

    static void Run(Form f, Label st)
    {
        string tmp = Path.Combine(Path.GetTempPath(), "AureluneSetupPkg");
        try { if (Directory.Exists(tmp)) Directory.Delete(tmp, true); } catch { }
        Directory.CreateDirectory(tmp);
        string zip = Path.Combine(tmp, "aurelune.zip");
        using (WebClient wc = new WebClient())
        {
            wc.Headers.Add("User-Agent", "AureluneStudio-Setup");
            wc.DownloadFile("https://codeload.github.com/" + Repo + "/zip/refs/heads/" + Branch, zip);
        }
        Say(f, st, M("Unpacking …", "Entpacke …"));
        string dir = Path.Combine(tmp, "pkg");
        ZipFile.ExtractToDirectory(zip, dir);
        string setup = null;
        foreach (string p in Directory.GetFiles(dir, "setup.ps1", SearchOption.AllDirectories))
        {
            string inst = Path.GetDirectoryName(p);
            if (File.Exists(Path.Combine(Path.Combine(Path.GetDirectoryName(inst), "app"), "version.txt"))) { setup = p; break; }
        }
        if (setup == null) throw new Exception("setup.ps1 not found in the download");
        Say(f, st, M("Starting the installer …", "Starte den Installer …"));
        string win = Environment.GetEnvironmentVariable("SystemRoot") ?? @"C:\Windows";
        string ps = Path.Combine(win, @"Sysnative\WindowsPowerShell\v1.0\powershell.exe");
        if (!File.Exists(ps)) ps = Path.Combine(win, @"System32\WindowsPowerShell\v1.0\powershell.exe");
        ProcessStartInfo psi = new ProcessStartInfo(ps,
            "-NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File \"" + setup + "\"");
        psi.UseShellExecute = false;
        psi.CreateNoWindow = true;
        psi.WorkingDirectory = Path.GetDirectoryName(setup);
        Process.Start(psi);
        Thread.Sleep(1500);
    }
}
