import { updateFees } from "@/app/workspace-actions";
import { getUserColleges, requireCurrentUser } from "@/lib/app-data";

export default async function FeesPage() {
  const user = await requireCurrentUser();
  const colleges = await getUserColleges(user.id);

  return (
    <main className="shell">
      <section className="page-header-row">
        <div>
          <span className="eyebrow">Fees</span>
          <h1 className="page-title">Fee tracker</h1>
          <p className="lede">
            This now uses persisted per-college fee state. It is the web version of the NiceGUI
            fee tracker, even if the visual treatment is still rough.
          </p>
        </div>
      </section>
      <section className="stack">
        {colleges.map((college) => (
          <form action={updateFees} className="panel stack" key={college.id}>
            <input name="collegeSlug" type="hidden" value={college.slug} />
            <input name="collegeName" type="hidden" value={college.name} />
            <input name="current" type="hidden" value={JSON.stringify(college.fees)} />
            <div className="subpanel-header">
              <strong>{college.name}</strong>
              <span className="pill">{college.fees.payment_status as string}</span>
            </div>
            <div className="four-up">
              <input className="field" defaultValue={String(college.fees.application_fee ?? 0)} name="application_fee" placeholder="Application fee" type="number" />
              <select className="field" defaultValue={String(college.fees.fee_waiver_status ?? "Not requested")} name="fee_waiver_status">
                <option value="Not requested">Not requested</option>
                <option value="Requested">Requested</option>
                <option value="Approved">Approved</option>
                <option value="Denied">Denied</option>
              </select>
              <select className="field" defaultValue={String(college.fees.payment_status ?? "Not paid")} name="payment_status">
                <option value="Not paid">Not paid</option>
                <option value="Paid">Paid</option>
              </select>
              <input className="field" defaultValue={String(college.fees.notes ?? "")} name="notes" placeholder="Notes" />
            </div>
            <div className="four-up">
              <label className="checkbox-row"><input defaultChecked={Boolean(college.fees.css_profile_required)} name="css_profile_required" type="checkbox" /><span>CSS Profile</span></label>
              <input className="field" defaultValue={String(college.fees.css_profile_cost ?? 0)} name="css_profile_cost" type="number" />
              <label className="checkbox-row"><input defaultChecked={Boolean(college.fees.fafsa_required)} name="fafsa_required" type="checkbox" /><span>FAFSA</span></label>
              <input className="field" defaultValue={String(college.fees.fafsa_cost ?? 0)} name="fafsa_cost" type="number" />
            </div>
            <div className="four-up">
              <label className="checkbox-row"><input defaultChecked={Boolean(college.fees.sat_score_send_required)} name="sat_score_send_required" type="checkbox" /><span>SAT send</span></label>
              <input className="field" defaultValue={String(college.fees.sat_score_send_cost ?? 0)} name="sat_score_send_cost" type="number" />
              <label className="checkbox-row"><input defaultChecked={Boolean(college.fees.ap_score_send_required)} name="ap_score_send_required" type="checkbox" /><span>AP send</span></label>
              <input className="field" defaultValue={String(college.fees.ap_score_send_cost ?? 0)} name="ap_score_send_cost" type="number" />
            </div>
            <button className="button" type="submit">Save fee tracker</button>
          </form>
        ))}
      </section>
    </main>
  );
}
