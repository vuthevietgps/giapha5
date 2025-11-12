import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { FamilyService } from '../families/services/family';
import { MemberService } from '../members/services/member';
import type { Family } from '../families/models/family.model';
import type { Member } from '../members/models/member.model';

interface DayEvents { day: number; lunarDay?: number; birthdays: Member[]; deathdays: Member[]; }

// Simple sun-to-lunar conversion (Vietnam timezone, UTC+7)
// Algorithm adapted from common implementations of the Vietnamese lunar calendar.
// Covers years ~1900-2100 which is sufficient for genealogy use cases.
// Returns [lunarDay, lunarMonth, lunarYear, isLeap]
function INT(d: number){ return Math.floor(d); }
function jdFromDate(dd: number, mm: number, yy: number){
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12*a - 3;
  let jd = dd + INT((153*m + 2)/5) + 365*y + INT(y/4) - INT(y/100) + INT(y/400) - 32045;
  // adjust to local timezone (UTC+7) by subtracting 7/24 of a day from JD noon-based conversions is not needed here for date-only
  return jd;
}
function NewMoon(k: number){
  const T = k/1236.85;
  const T2 = T*T; const T3 = T2*T; const dr = Math.PI/180;
  let Jd1 = 2415020.75933 + 29.53058868*k + 0.0001178*T2 - 0.000000155*T3;
  Jd1 = Jd1 + 0.00033*Math.sin((166.56 + 132.87*T - 0.009173*T2)*dr);
  const M = 359.2242 + 29.10535608*k - 0.0000333*T2 - 0.00000347*T3;
  const Mpr = 306.0253 + 385.81691806*k + 0.0107306*T2 + 0.00001236*T3;
  const F = 21.2964 + 390.67050646*k - 0.0016528*T2 - 0.00000239*T3;
  let C1 = (0.1734 - 0.000393*T)*Math.sin(M*dr) + 0.0021*Math.sin(2*dr*M);
  C1 = C1 - 0.4068*Math.sin(Mpr*dr) + 0.0161*Math.sin(2*dr*Mpr);
  C1 = C1 - 0.0004*Math.sin(3*dr*Mpr);
  C1 = C1 + 0.0104*Math.sin(2*dr*F) - 0.0051*Math.sin((M+Mpr)*dr);
  C1 = C1 - 0.0074*Math.sin((M-Mpr)*dr) + 0.0004*Math.sin((2*F+M)*dr);
  C1 = C1 - 0.0004*Math.sin((2*F-M)*dr) - 0.0006*Math.sin((2*F+Mpr)*dr) + 0.0010*Math.sin((2*F-Mpr)*dr) + 0.0005*Math.sin((2*Mpr+M)*dr);
  let deltaT;
  if (T < -11) deltaT = 0.001 + 0.000839*T + 0.0002261*T2 - 0.00000845*T3 - 0.000000081*T*T3;
  else deltaT = -0.000278 + 0.000265*T + 0.000262*T2;
  const JdNew = Jd1 + C1 - deltaT;
  return JdNew;
}
function getSunLongitude(jdn: number){
  const T = (jdn - 2451545.5)/36525; const T2 = T*T; const dr = Math.PI/180;
  const M = 357.52910 + 35999.05030*T - 0.0001559*T2 - 0.00000048*T*T2;
  const L0 = 280.46645 + 36000.76983*T + 0.0003032*T2;
  let DL = (1.914600 - 0.004817*T - 0.000014*T2)*Math.sin(dr*M);
  DL = DL + (0.019993 - 0.000101*T)*Math.sin(2*dr*M) + 0.000290*Math.sin(3*dr*M);
  let L = L0 + DL; L = L*dr; L = L - Math.PI*2*INT(L/(Math.PI*2));
  return INT(L / Math.PI * 6);
}
function getLunarMonth11(yy: number){
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off/29.530588853);
  let nm = NewMoon(k);
  let sunLong = getSunLongitude(INT(nm+0.5));
  if (sunLong >= 9) nm = NewMoon(k-1);
  return INT(nm+0.5);
}
function getLeapMonthOffset(a11: number){
  const k = INT(0.5 + (a11 - 2415021.076998695)/29.530588853);
  let last = 0; let i = 1; let arc = getSunLongitude(INT(NewMoon(k+i)+0.5));
  do { last = arc; i++; arc = getSunLongitude(INT(NewMoon(k+i)+0.5)); } while (arc != last && i < 14);
  return i - 1;
}
function convertSolar2Lunar(dd: number, mm: number, yy: number){
  const dayNumber = jdFromDate(dd, mm, yy);
  let k = INT((dayNumber - 2415021.076998695)/29.530588853);
  let monthStart = INT(NewMoon(k+1)+0.5);
  if (monthStart > dayNumber) monthStart = INT(NewMoon(k)+0.5);
  let a11 = getLunarMonth11(yy);
  let b11 = getLunarMonth11(yy+1);
  let lunarYear = yy;
  let lunarMonth, lunarDay, lunarLeap = 0;
  if (a11 >= monthStart) { a11 = getLunarMonth11(yy-1); lunarYear = yy; b11 = getLunarMonth11(yy); }
  lunarDay = dayNumber - monthStart + 1;
  const diff = INT((monthStart - a11)/29);
  lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11);
    if (diff >= leapMonthDiff) { lunarMonth = diff + 10; if (diff == leapMonthDiff) lunarLeap = 1; }
  }
  if (lunarMonth > 12) { lunarMonth -= 12; }
  if (lunarMonth >= 11 && diff < 4) lunarYear = yy;
  return [lunarDay, lunarMonth, lunarYear, lunarLeap] as const;
}

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FormsModule,
  ],
  templateUrl: './calendar-page.html',
  styles: [`
    .shell{display:flex; gap:16px; padding:16px; height: calc(100vh - 0px); box-sizing:border-box}
    .left{flex:1}
    .right{width:360px}
    .header{display:flex; gap:12px; align-items:center; margin-bottom:12px}
    .grid{display:grid; grid-template-columns: repeat(7, 1fr); gap:6px}
    .cell{border:1px solid #ddd; border-radius:6px; padding:6px; min-height:80px; display:flex; flex-direction:column; gap:4px}
    .cell .d{font-weight:600}
    .badge{display:inline-block; border-radius:10px; padding:2px 6px; font-size:11px; color:#fff}
    .bday{background:#1976d2}
    .dday{background:#d81b60}
    .sticky{position:sticky; top:0; background:#fff; z-index:1; padding:8px 0}
  `]
})
export class CalendarPage {
  private readonly familiesApi = inject(FamilyService);
  private readonly membersApi = inject(MemberService);

  families: Family[] = [];
  selectedFamilyId: string | null = null;

  monthDate = new Date(); // current month view
  days: DayEvents[] = [];
  selectedDay: number | null = null;

  ngOnInit(){
    this.familiesApi.list().subscribe(f => {
      this.families = f;
      if (f.length && !this.selectedFamilyId){
        this.selectedFamilyId = f[0].id || null;
      }
      this.reload();
    });
  }

  onFamilyChange(){ this.reload(); }
  prevMonth(){ const d = new Date(this.monthDate); d.setMonth(d.getMonth()-1); this.monthDate = d; this.reload(); }
  nextMonth(){ const d = new Date(this.monthDate); d.setMonth(d.getMonth()+1); this.monthDate = d; this.reload(); }
  today(){ this.monthDate = new Date(); this.reload(); }

  selectDay(day: number){ this.selectedDay = day; }

  private reload(){
    if (!this.selectedFamilyId){ this.days = []; return; }
    this.membersApi.listByFamily(this.selectedFamilyId).subscribe(members => {
      this.days = this.computeMonthEvents(this.monthDate, members || []);
      // auto-select today if in current month
      const now = new Date();
      if (now.getMonth() === this.monthDate.getMonth() && now.getFullYear() === this.monthDate.getFullYear()){
        this.selectedDay = now.getDate();
      } else {
        this.selectedDay = null;
      }
    });
  }

  private computeMonthEvents(monthDate: Date, members: Member[]): DayEvents[]{
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const byDay: DayEvents[] = Array.from({ length: daysInMonth }, (_, i) => ({ day: i+1, lunarDay: undefined, birthdays: [], deathdays: [] }));

    for (const m of members){
      const b = m.dob ? new Date(m.dob) : null;
      const d = m.dod ? new Date(m.dod) : null;
      if (b && b.getMonth() === month){
        const day = b.getDate();
        byDay[day-1].birthdays.push(m);
      }
      if (d && d.getMonth() === month){
        const day = d.getDate();
        byDay[day-1].deathdays.push(m);
      }
    }
    // compute lunar day per date
    for (let i=0;i<daysInMonth;i++){
      const dd = i+1; const [lDay] = convertSolar2Lunar(dd, month+1, year);
      byDay[i].lunarDay = lDay;
    }
    // sort by name for stable display
    for (const cell of byDay){
      cell.birthdays.sort((a,b)=> (a.fullName||'').localeCompare(b.fullName||''));
      cell.deathdays.sort((a,b)=> (a.fullName||'').localeCompare(b.fullName||''));
    }
    return byDay;
  }
}
